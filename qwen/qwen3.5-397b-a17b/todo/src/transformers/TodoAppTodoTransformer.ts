import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ITodoAppMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppMember";
import { ITodoAppTodo } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppTodo";
import { ITodoAppTodoEditHistory } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppTodoEditHistory";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import { VariadicSingleton } from "tstl";
import typia, { tags } from "typia";

import { MyGlobal } from "../MyGlobal";
import { toISOStringSafe } from "../utils/toISOStringSafe";
import { TodoAppMemberAtSummaryTransformer } from "./TodoAppMemberAtSummaryTransformer";
import { TodoAppTodoEditHistoryTransformer } from "./TodoAppTodoEditHistoryTransformer";

export namespace TodoAppTodoTransformer {
  export type Payload = Prisma.todo_app_todosGetPayload<
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
        is_completed: true,
        is_deleted: true,
        deleted_at: true,
        created_at: true,
        updated_at: true,
        member: TodoAppMemberAtSummaryTransformer.select(),
        editHistories: TodoAppTodoEditHistoryTransformer.select(),
      },
    } satisfies Prisma.todo_app_todosFindManyArgs;
  }
  export async function transform(input: Payload): Promise<ITodoAppTodo> {
    return {
      id: input.id,
      title: input.title,
      description: input.description ?? null,
      startDate: input.start_date?.toISOString() ?? null,
      dueDate: input.due_date?.toISOString() ?? null,
      isCompleted: input.is_completed,
      isDeleted: input.is_deleted,
      deletedAt: input.deleted_at?.toISOString() ?? null,
      createdAt: input.created_at.toISOString(),
      updatedAt: input.updated_at.toISOString(),
      member: await TodoAppMemberAtSummaryTransformer.transform(input.member),
      editHistories: await ArrayUtil.asyncMap(
        input.editHistories,
        TodoAppTodoEditHistoryTransformer.transform,
      ),
    } satisfies ITodoAppTodo;
  }
}
