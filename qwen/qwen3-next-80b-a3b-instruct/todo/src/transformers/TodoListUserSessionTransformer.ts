import { Prisma } from "@prisma/sdk";
import { ArrayUtil } from "@nestia/e2e";
import typia, { tags } from "typia";

import { ITodoListUserSession } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoListUserSession";

import { toISOStringSafe } from "../utils/toISOStringSafe";

export namespace TodoListUserSessionTransformer {
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
  ): Promise<ITodoListUserSession> {
    return {
      id: input.id,
      created_at: input.created_at.toISOString(),
      last_activity_at: input.created_at.toISOString(), // Derived: session creation time as proxy since last_activity_at doesn't exist
      expires_at: input.expired_at.toISOString(),
      is_active: input.expired_at > new Date(), // Derived: session active if expired_at is in future
    };
  }
}
