import {sqliteTable,text,integer} from "drizzle-orm/sqlite-core";
export const orders=sqliteTable("orders",{id:text("id").primaryKey(),tokenHash:text("token_hash").notNull().unique(),fingerprint:text("fingerprint").notNull(),payload:text("payload").notNull(),version:integer("version").notNull().default(1),createdAt:text("created_at").notNull()});
export const ownerSessions=sqliteTable("owner_sessions",{hash:text("hash").primaryKey(),userId:text("user_id").notNull(),expires:integer("expires").notNull()});
export const ownerOtp=sqliteTable("owner_otp",{userId:text("user_id").primaryKey(),lastStep:integer("last_step").notNull()});
export const requestLimits=sqliteTable("request_limits",{key:text("key").primaryKey(),count:integer("count").notNull(),until:integer("until").notNull()});
