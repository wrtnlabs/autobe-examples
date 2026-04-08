import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IMultiUserTodoMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IMultiUserTodoMember";
import { IMultiUserTodoTodo } from "@ORGANIZATION/PROJECT-api/lib/structures/IMultiUserTodoTodo";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import { VariadicSingleton } from "tstl";
import typia, { tags } from "typia";

import { MyGlobal } from "../MyGlobal";
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
        start_date: true,
        due_date: true,
        is_complete: true,
        is_deleted: true,
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
      is_complete: input.is_complete,
      start_date: input.start_date?.toISOString() ?? null,
      due_date: input.due_date?.toISOString() ?? null,
      created_at: input.created_at.toISOString(),
      deleted_at: input.deleted_at?.toISOString() ?? null,
      author: await MultiUserTodoMemberAtSummaryTransformer.transform(
        input.member,
      ),
    } satisfies IMultiUserTodoTodo.ISummary;
  }
}
