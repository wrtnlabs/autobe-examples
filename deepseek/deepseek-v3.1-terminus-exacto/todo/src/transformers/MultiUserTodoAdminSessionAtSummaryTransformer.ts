import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IMultiUserTodoAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IMultiUserTodoAdmin";
import { IMultiUserTodoAdminSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IMultiUserTodoAdminSession";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import typia, { tags } from "typia";

import { toISOStringSafe } from "../utils/toISOStringSafe";
import { MultiUserTodoAdminAtSummaryTransformer } from "./MultiUserTodoAdminAtSummaryTransformer";

export namespace MultiUserTodoAdminSessionAtSummaryTransformer {
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
        errorLogs: true,
      },
    } satisfies Prisma.multi_user_todo_admin_sessionsFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<IMultiUserTodoAdminSession.ISummary> {
    return {
      id: input.id,
      created_at: input.created_at.toISOString(),
      expired_at: input.expired_at.toISOString(),
      ip: input.ip,
      admin: await MultiUserTodoAdminAtSummaryTransformer.transform(
        input.admin,
      ),
    };
  }
}
