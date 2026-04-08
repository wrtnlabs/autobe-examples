import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IMultiUserTodoTodo } from "@ORGANIZATION/PROJECT-api/lib/structures/IMultiUserTodoTodo";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import { VariadicSingleton } from "tstl";
import typia, { tags } from "typia";

import { MyGlobal } from "../MyGlobal";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export namespace MultiUserTodoTodoTransformer {
  export type Payload = Prisma.multi_user_todo_todosGetPayload<
    ReturnType<typeof select>
  >;
  export function select() {
    return {
      select: {
        id: true,
        member: {
          select: {
            id: true,
          },
        } satisfies Prisma.multi_user_todo_membersFindManyArgs,
        title: true,
        description: true,
        start_date: true,
        due_date: true,
        is_complete: true,
        is_deleted: true,
        deleted_at: true,
        created_at: true,
        updated_at: true,
        editHistories: {
          select: {},
        } satisfies Prisma.multi_user_todo_todos_editsFindManyArgs,
      },
    } satisfies Prisma.multi_user_todo_todosFindManyArgs;
  }
  export async function transform(input: Payload): Promise<IMultiUserTodoTodo> {
    return {
      id: input.id,
      multi_user_todo_member_id: input.member.id,
      title: input.title,
      description: input.description ?? null,
      start_date: input.start_date?.toISOString() ?? null,
      due_date: input.due_date?.toISOString() ?? null,
      is_complete: input.is_complete,
      is_deleted: input.is_deleted,
      deleted_at: input.deleted_at?.toISOString() ?? null,
      created_at: input.created_at.toISOString(),
      updated_at: input.updated_at.toISOString(),
    } satisfies IMultiUserTodoTodo;
  }
}
