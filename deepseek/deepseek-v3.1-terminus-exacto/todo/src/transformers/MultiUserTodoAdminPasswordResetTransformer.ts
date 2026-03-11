import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IMultiUserTodoAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IMultiUserTodoAdmin";
import { IMultiUserTodoAdminPasswordReset } from "@ORGANIZATION/PROJECT-api/lib/structures/IMultiUserTodoAdminPasswordReset";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import typia, { tags } from "typia";

import { toISOStringSafe } from "../utils/toISOStringSafe";
import { MultiUserTodoAdminAtSummaryTransformer } from "./MultiUserTodoAdminAtSummaryTransformer";

export namespace MultiUserTodoAdminPasswordResetTransformer {
  export type Payload = Prisma.multi_user_todo_admin_password_resetsGetPayload<
    ReturnType<typeof select>
  >;
  export function select() {
    return {
      select: {
        id: true,
        token: true,
        expires_at: true,
        used_at: true,
        created_at: true,
        updated_at: true,
        admin: MultiUserTodoAdminAtSummaryTransformer.select(),
      },
    } satisfies Prisma.multi_user_todo_admin_password_resetsFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<IMultiUserTodoAdminPasswordReset> {
    return {
      id: input.id,
      expires_at: input.expires_at.toISOString(),
      used_at: input.used_at ? input.used_at.toISOString() : null,
      created_at: input.created_at.toISOString(),
      updated_at: input.updated_at.toISOString(),
      admin: await MultiUserTodoAdminAtSummaryTransformer.transform(
        input.admin,
      ),
    };
  }
}
