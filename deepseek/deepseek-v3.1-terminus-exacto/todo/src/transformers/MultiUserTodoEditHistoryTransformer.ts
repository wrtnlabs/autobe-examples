import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IMultiUserTodoEditHistory } from "@ORGANIZATION/PROJECT-api/lib/structures/IMultiUserTodoEditHistory";
import { IMultiUserTodoMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IMultiUserTodoMember";
import { IMultiUserTodoTodo } from "@ORGANIZATION/PROJECT-api/lib/structures/IMultiUserTodoTodo";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import typia, { tags } from "typia";

import { toISOStringSafe } from "../utils/toISOStringSafe";
import { MultiUserTodoMemberAtSummaryTransformer } from "./MultiUserTodoMemberAtSummaryTransformer";
import { MultiUserTodoTodoAtSummaryTransformer } from "./MultiUserTodoTodoAtSummaryTransformer";

export namespace MultiUserTodoEditHistoryTransformer {
  export type Payload = Prisma.multi_user_todo_edit_historiesGetPayload<
    ReturnType<typeof select>
  >;
  export function select() {
    return {
      select: {
        id: true,
        created_at: true,
        todo: MultiUserTodoTodoAtSummaryTransformer.select(),
        member: MultiUserTodoMemberAtSummaryTransformer.select(),
      },
    } satisfies Prisma.multi_user_todo_edit_historiesFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<IMultiUserTodoEditHistory> {
    return {
      id: input.id,
      created_at: input.created_at.toISOString(),
      todo: await MultiUserTodoTodoAtSummaryTransformer.transform(input.todo),
      member: await MultiUserTodoMemberAtSummaryTransformer.transform(
        input.member,
      ),
    };
  }
}
