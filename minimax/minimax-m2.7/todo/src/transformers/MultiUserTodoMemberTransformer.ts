import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IMultiUserTodoMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IMultiUserTodoMember";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import typia, { tags } from "typia";

import { toISOStringSafe } from "../utils/toISOStringSafe";

export namespace MultiUserTodoMemberTransformer {
  export type Payload = Prisma.multi_user_todo_membersGetPayload<
    ReturnType<typeof select>
  >;
  export function select() {
    return {
      select: {
        id: true,
        email: true,
        display_name: true,
        created_at: true,
        updated_at: true,
      },
    } satisfies Prisma.multi_user_todo_membersFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<IMultiUserTodoMember> {
    return {
      id: input.id,
      email: input.email,
      display_name: input.display_name,
      created_at: input.created_at.toISOString(),
      updated_at: input.updated_at.toISOString(),
    };
  }
}
