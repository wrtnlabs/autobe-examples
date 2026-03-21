import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IMultiUserTodoMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IMultiUserTodoMember";
import { IMultiUserTodoTodo } from "@ORGANIZATION/PROJECT-api/lib/structures/IMultiUserTodoTodo";
import { IMultiUserTodoTodoEditHistory } from "@ORGANIZATION/PROJECT-api/lib/structures/IMultiUserTodoTodoEditHistory";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import typia, { tags } from "typia";

import { toISOStringSafe } from "../utils/toISOStringSafe";
import { MultiUserTodoMemberAtSummaryTransformer } from "./MultiUserTodoMemberAtSummaryTransformer";
import { MultiUserTodoTodoEditHistoryTransformer } from "./MultiUserTodoTodoEditHistoryTransformer";

export namespace MultiUserTodoTodoTransformer {
  export type Payload = Prisma.multi_user_todo_todosGetPayload<
    ReturnType<typeof select>
  >;
  export function select() {
    return {
      select: {
        id: true,
        title: true,
        description: true,
        start_date: true,
        due_date: true,
        completed: true,
        created_at: true,
        updated_at: true,
        deleted_at: true,
        member: MultiUserTodoMemberAtSummaryTransformer.select(),
        editHistories: MultiUserTodoTodoEditHistoryTransformer.select(),
      },
    } satisfies Prisma.multi_user_todo_todosFindManyArgs;
  }
  export async function transform(input: Payload): Promise<IMultiUserTodoTodo> {
    return {
      id: input.id,
      title: input.title,
      description: input.description,
      start_date: input.start_date?.toISOString() ?? null,
      due_date: input.due_date?.toISOString() ?? null,
      completed: input.completed,
      created_at: input.created_at.toISOString(),
      updated_at: input.updated_at.toISOString(),
      deleted_at: input.deleted_at?.toISOString() ?? null,
      member: await MultiUserTodoMemberAtSummaryTransformer.transform(
        input.member,
      ),
      editHistories: await ArrayUtil.asyncMap(
        input.editHistories,
        MultiUserTodoTodoEditHistoryTransformer.transform,
      ),
      editHistories_count: input.editHistories.length,
    };
  }
}
