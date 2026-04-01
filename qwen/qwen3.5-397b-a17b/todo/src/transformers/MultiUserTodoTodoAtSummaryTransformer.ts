import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IMultiUserTodoMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IMultiUserTodoMember";
import { IMultiUserTodoTodo } from "@ORGANIZATION/PROJECT-api/lib/structures/IMultiUserTodoTodo";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import typia, { tags } from "typia";

import { toISOStringSafe } from "../utils/toISOStringSafe";
import { MultiUserTodoMemberAtSummaryTransformer } from "./MultiUserTodoMemberAtSummaryTransformer";

export namespace MultiUserTodoTodoAtSummaryTransformer {
  export type Payload = Prisma.multi_user_todo_todosGetPayload<
    ReturnType<typeof select>
  >;
  export function select() {
    return {
      select: {
        id: true,
        title: true,
        description: true,
        started_at: true,
        due_at: true,
        completed_at: true,
        deleted_at: true,
        created_at: true,
        updated_at: true,
        member: MultiUserTodoMemberAtSummaryTransformer.select(),
        editHistories: true,
      },
    } satisfies Prisma.multi_user_todo_todosFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<IMultiUserTodoTodo.ISummary> {
    return {
      id: input.id,
      title: input.title,
      member: await MultiUserTodoMemberAtSummaryTransformer.transform(
        input.member,
      ),
      startedAt: input.started_at?.toISOString() ?? undefined,
      dueAt: input.due_at?.toISOString() ?? undefined,
      completed: input.completed_at !== null,
      deletedAt: input.deleted_at?.toISOString() ?? null,
      createdAt: input.created_at.toISOString(),
    };
  }
}
