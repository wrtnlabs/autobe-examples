import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ITodoTodo } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoTodo";
import { ITodoUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoUser";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import typia, { tags } from "typia";

import { toISOStringSafe } from "../utils/toISOStringSafe";
import { TodoUserAtSummaryTransformer } from "./TodoUserAtSummaryTransformer";

export namespace TodoTodoAtSummaryTransformer {
  export type Payload = Prisma.todo_todosGetPayload<ReturnType<typeof select>>;
  export function select() {
    return {
      select: {
        id: true,
        title: true,
        description: true,
        start_date: true,
        due_date: true,
        is_completed: true,
        created_at: true,
        updated_at: true,
        deleted_at: true,
        user: TodoUserAtSummaryTransformer.select(),
        todo_histories: { select: {} },
      },
    } satisfies Prisma.todo_todosFindManyArgs;
  }
  export async function transform(input: Payload): Promise<ITodoTodo.ISummary> {
    return {
      id: input.id,
      title: input.title,
      is_completed: input.is_completed,
      created_at: input.created_at.toISOString(),
      due_date: input.due_date ? input.due_date.toISOString() : null,
      user: await TodoUserAtSummaryTransformer.transform(input.user),
    };
  }
}
