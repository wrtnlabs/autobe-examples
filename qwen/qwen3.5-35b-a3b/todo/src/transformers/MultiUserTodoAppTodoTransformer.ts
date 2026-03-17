import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IMultiUserTodoAppMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IMultiUserTodoAppMember";
import { IMultiUserTodoAppTodo } from "@ORGANIZATION/PROJECT-api/lib/structures/IMultiUserTodoAppTodo";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import typia, { tags } from "typia";

import { toISOStringSafe } from "../utils/toISOStringSafe";
import { MultiUserTodoAppMemberAtSummaryTransformer } from "./MultiUserTodoAppMemberAtSummaryTransformer";

export namespace MultiUserTodoAppTodoTransformer {
  export type Payload = Prisma.multi_user_todo_app_todosGetPayload<
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
        created_at: true,
        updated_at: true,
        deleted_at: true,
        user: MultiUserTodoAppMemberAtSummaryTransformer.select(),
        editHistories: true,
      },
    } satisfies Prisma.multi_user_todo_app_todosFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<IMultiUserTodoAppTodo> {
    return {
      id: input.id,
      title: input.title,
      description: input.description ?? null,
      startDate: input.start_date?.toISOString() ?? null,
      dueDate: input.due_date?.toISOString() ?? null,
      isCompleted: input.is_completed,
      createdAt: input.created_at.toISOString(),
      updatedAt: input.updated_at.toISOString(),
      deletedAt: input.deleted_at?.toISOString() ?? null,
      user: await MultiUserTodoAppMemberAtSummaryTransformer.transform(
        input.user,
      ),
    } satisfies IMultiUserTodoAppTodo;
  }
}
