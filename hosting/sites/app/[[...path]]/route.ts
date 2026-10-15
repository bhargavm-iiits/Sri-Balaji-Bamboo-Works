import { env } from "cloudflare:workers";
import { handle } from "../../server/handler.mjs";
export const dynamic="force-dynamic";
export const GET=(request:Request)=>handle(request,env);
export const POST=GET;
export const HEAD=GET;
export const PUT=GET;
export const DELETE=GET;
