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
        profile: {
          select: {
            display_name: true,
          },
        } satisfies Prisma.multi_user_todo_user_profilesFindManyArgs,
      },
    } satisfies Prisma.multi_user_todo_membersFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<IMultiUserTodoMember.ISummary> {
    return {
      id: input.id,
      displayName: input.profile?.display_name ?? "",
    };
  }
}
