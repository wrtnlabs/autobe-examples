import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ITodoAppMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppMember";
import { ITodoAppTodo } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppTodo";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import typia, { tags } from "typia";

import { toISOStringSafe } from "../utils/toISOStringSafe";
import { TodoAppMemberAtSummaryTransformer } from "./TodoAppMemberAtSummaryTransformer";

export namespace TodoAppTodoAtSummaryTransformer {
  export type Payload = Prisma.todo_app_todosGetPayload<
    ReturnType<typeof select>
  >;
  export function select() {
    return {
      select: {
        id: true,
        title: true,
        started_at: true,
        due_at: true,
        completed: true,
        created_at: true,
        member: TodoAppMemberAtSummaryTransformer.select(),
      },
    } satisfies Prisma.todo_app_todosFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<ITodoAppTodo.ISummary> {
    return {
      id: input.id,
      title: input.title,
      completed: input.completed,
      started_at: input.started_at?.toISOString() ?? null,
      due_at: input.due_at?.toISOString() ?? null,
      created_at: input.created_at.toISOString(),
      member: await TodoAppMemberAtSummaryTransformer.transform(input.member),
    };
  }
}
