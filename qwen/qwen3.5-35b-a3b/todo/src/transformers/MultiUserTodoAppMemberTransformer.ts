import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IMultiUserTodoAppMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IMultiUserTodoAppMember";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import typia, { tags } from "typia";

import { toISOStringSafe } from "../utils/toISOStringSafe";

export namespace MultiUserTodoAppMemberTransformer {
  export type Payload = Prisma.multi_user_todo_app_membersGetPayload<
    ReturnType<typeof select>
  >;
  export function select() {
    return {
      select: {
        id: true,
        email: true,
        password_hash: true,
        created_at: true,
        updated_at: true,
        deleted_at: true,
        sessions: true,
        passwordReset: true,
        todos: true,
        todoEditHistories: true,
      },
    } satisfies Prisma.multi_user_todo_app_membersFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<IMultiUserTodoAppMember> {
    return {
      id: input.id,
      createdAt: toISOStringSafe(input.created_at),
      updatedAt: toISOStringSafe(input.updated_at),
      displayName: input.email ?? "",
    };
  }
}
