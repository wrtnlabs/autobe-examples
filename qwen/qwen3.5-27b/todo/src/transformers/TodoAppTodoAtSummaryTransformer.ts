import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ITodoAppMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppMember";
import { ITodoAppTodo } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppTodo";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import { VariadicSingleton } from "tstl";
import typia, { tags } from "typia";

import { MyGlobal } from "../MyGlobal";
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
        completed: true,
        start_date: true,
        due_date: true,
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
      start_date: input.start_date?.toISOString() ?? null,
      due_date: input.due_date?.toISOString() ?? null,
      created_at: input.created_at.toISOString(),
      member: await TodoAppMemberAtSummaryTransformer.transform(input.member),
    };
  }
}
