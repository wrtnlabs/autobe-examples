import { Prisma } from "@prisma/sdk";
import { ArrayUtil } from "@nestia/e2e";
import typia, { tags } from "typia";

import { ITodoListTodo } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoListTodo";
import { ITodoListUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoListUser";

import { toISOStringSafe } from "../utils/toISOStringSafe";

import { TodoListUserAtSummaryTransformer } from "./TodoListUserAtSummaryTransformer";

export namespace TodoListTodoTransformer {
  export type Payload = Prisma.todo_list_todosGetPayload<
    ReturnType<typeof select>
  >;
  export function select() {
    return {
      select: {
        id: true,
        title: true,
        description: true,
        status: true,
        created_at: true,
        user: TodoListUserAtSummaryTransformer.select(),
        updated_at: true,
        deleted_at: true,
      },
    } satisfies Prisma.todo_list_todosFindManyArgs;
  }
  export async function transform(input: Payload): Promise<ITodoListTodo> {
    return {
      id: input.id,
      title: input.title,
      details: input.description ?? undefined,
      completed: input.status === "completed" ? true : false,
      priority: "low", // default value (not in database schema)
      sequence: 0, // default value (not in database schema)
      createdAt: input.created_at.toISOString(),
      user: await TodoListUserAtSummaryTransformer.transform(input.user),
    };
  }
}
