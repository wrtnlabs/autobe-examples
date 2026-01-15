import { Prisma } from "@prisma/sdk";
import { ArrayUtil } from "@nestia/e2e";
import typia, { tags } from "typia";

import { ITodoListUserSession } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoListUserSession";

import { toISOStringSafe } from "../utils/toISOStringSafe";

export namespace TodoListUserSessionAtSummaryTransformer {
  export type Payload = Prisma.todo_list_user_sessionsGetPayload<
    ReturnType<typeof select>
  >;
  export function select() {
    return {
      select: {
        id: true,
        ip: true,
        href: true,
        referrer: true,
        created_at: true,
        expired_at: true,
        user: true,
      },
    } satisfies Prisma.todo_list_user_sessionsFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<ITodoListUserSession.ISummary> {
    const now = new Date();
    return {
      id: input.id,
      user_id: input.user.id,
      created_at: input.created_at.toISOString(),
      expires_at: input.expired_at.toISOString(),
      last_activity: input.created_at.toISOString(), // using created_at as fallback for last_activity
      status: input.expired_at > now ? "active" : "expired", // derive status from expiration
      ip_address: input.ip,
      user_agent: "unknown", // no user_agent field in schema, use constant as fallback
    };
  }
}
