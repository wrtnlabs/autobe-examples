import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IMultiUserTodoAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IMultiUserTodoAdmin";
import { IMultiUserTodoAdminSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IMultiUserTodoAdminSession";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import typia, { tags } from "typia";

import { toISOStringSafe } from "../utils/toISOStringSafe";
import { MultiUserTodoAdminAtSummaryTransformer } from "./MultiUserTodoAdminAtSummaryTransformer";

export namespace MultiUserTodoAdminSessionTransformer {
  export type Payload = Prisma.multi_user_todo_admin_sessionsGetPayload<
    ReturnType<typeof select>
  >;
  export function select() {
    return {
      select: {
        id: true,
        access_token: true,
        refresh_token: true,
        ip: true,
        href: true,
        referrer: true,
        created_at: true,
        expired_at: true,
        admin: MultiUserTodoAdminAtSummaryTransformer.select(),
        errorLogs: {
          select: {
            id: true,
            created_at: true,
            // Need to check the actual field name - assuming 'error_message' might be correct
            error_message: true,
            stack_trace: true,
          },
        } satisfies Prisma.multi_user_todo_error_logsFindManyArgs,
      },
    } satisfies Prisma.multi_user_todo_admin_sessionsFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<IMultiUserTodoAdminSession> {
    return {
      id: input.id,
      ip: input.ip,
      href: input.href,
      referrer: input.referrer,
      created_at: toISOStringSafe(input.created_at),
      expired_at: toISOStringSafe(input.expired_at),
      admin: await MultiUserTodoAdminAtSummaryTransformer.transform(
        input.admin,
      ),
    };
  }
}
