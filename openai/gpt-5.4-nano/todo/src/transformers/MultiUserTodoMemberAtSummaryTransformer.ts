import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IMultiUserTodoMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IMultiUserTodoMember";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import typia, { tags } from "typia";

import { toISOStringSafe } from "../utils/toISOStringSafe";

export namespace MultiUserTodoMemberAtSummaryTransformer {
  export type Payload = Prisma.multi_user_todo_membersGetPayload<
    ReturnType<typeof select>
  >;
  export function select() {
    return {
      select: {
        id: true,
        email: true,
        created_at: true,
        updated_at: true,
        deleted_at: true,
      },
    } satisfies Prisma.multi_user_todo_membersFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<IMultiUserTodoMember.ISummary> {
    return {
      id: input.id as unknown as IMultiUserTodoMember.ISummary["id"],
      email: input.email as unknown as IMultiUserTodoMember.ISummary["email"],
      created_at: toISOStringSafe(
        input.created_at,
      ) as unknown as IMultiUserTodoMember.ISummary["created_at"],
      updated_at: toISOStringSafe(
        input.updated_at,
      ) as unknown as IMultiUserTodoMember.ISummary["updated_at"],
      deleted_at:
        input.deleted_at == null
          ? (undefined as IMultiUserTodoMember.ISummary["deleted_at"])
          : (toISOStringSafe(
              input.deleted_at,
            ) as unknown as IMultiUserTodoMember.ISummary["deleted_at"]),
    };
  }
}
