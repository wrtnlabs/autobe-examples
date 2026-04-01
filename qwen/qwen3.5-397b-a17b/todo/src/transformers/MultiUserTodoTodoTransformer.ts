import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IMultiUserTodoMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IMultiUserTodoMember";
import { IMultiUserTodoTodo } from "@ORGANIZATION/PROJECT-api/lib/structures/IMultiUserTodoTodo";
import { IMultiUserTodoTodoEditHistory } from "@ORGANIZATION/PROJECT-api/lib/structures/IMultiUserTodoTodoEditHistory";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import typia, { tags } from "typia";

import { toISOStringSafe } from "../utils/toISOStringSafe";
import { MultiUserTodoMemberAtSummaryTransformer } from "./MultiUserTodoMemberAtSummaryTransformer";
import { MultiUserTodoTodoEditHistoryAtSummaryTransformer } from "./MultiUserTodoTodoEditHistoryAtSummaryTransformer";

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
        started_at: true,
        due_at: true,
        completed_at: true,
        deleted_at: true,
        created_at: true,
        updated_at: true,
        member: MultiUserTodoMemberAtSummaryTransformer.select(),
        editHistories:
          MultiUserTodoTodoEditHistoryAtSummaryTransformer.select(),
      },
    } satisfies Prisma.multi_user_todo_todosFindManyArgs;
  }
  export async function transform(input: Payload): Promise<IMultiUserTodoTodo> {
    return {
      id: input.id,
      title: input.title,
      description: input.description ?? null,
      started_at: input.started_at?.toISOString() ?? null,
      due_at: input.due_at?.toISOString() ?? null,
      completed_at: input.completed_at?.toISOString() ?? null,
      deleted_at: input.deleted_at?.toISOString() ?? null,
      created_at: input.created_at.toISOString(),
      updated_at: input.updated_at.toISOString(),
      member: await MultiUserTodoMemberAtSummaryTransformer.transform(
        input.member,
      ),
      editHistories: await ArrayUtil.asyncMap(
        input.editHistories,
        MultiUserTodoTodoEditHistoryAtSummaryTransformer.transform,
      ),
    };
  }
}
