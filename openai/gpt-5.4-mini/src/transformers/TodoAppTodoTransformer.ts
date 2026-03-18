import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ITodoAppMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppMember";
import { ITodoAppTodo } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppTodo";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import typia, { tags } from "typia";

import { toISOStringSafe } from "../utils/toISOStringSafe";
import { TodoAppMemberAtSummaryTransformer } from "./TodoAppMemberAtSummaryTransformer";

export namespace TodoAppTodoTransformer {
  export type Payload = Prisma.todo_app_todosGetPayload<
    ReturnType<typeof select>
  >;
  export async function transform(input: Payload): Promise<ITodoAppTodo> {
    return {
      id: input.id,
      member: await TodoAppMemberAtSummaryTransformer.transform(input.member),
      title: input.title,
      description: input.description,
      start_at: input.start_at?.toISOString() ?? null,
      due_at: input.due_at?.toISOString() ?? null,
      is_completed: input.is_completed,
      created_at: input.created_at.toISOString(),
      updated_at: input.updated_at.toISOString(),
      deleted_at: input.deleted_at?.toISOString() ?? null,
    };
  }
  export function select() {
    return {
      select: {
        id: true,
        member: TodoAppMemberAtSummaryTransformer.select(),
        title: true,
        description: true,
        start_at: true,
        due_at: true,
        is_completed: true,
        created_at: true,
        updated_at: true,
        deleted_at: true,
      },
    } satisfies Prisma.todo_app_todosFindManyArgs;
  }
}
