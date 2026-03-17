import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IMultiUserTodoMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IMultiUserTodoMember";
import { IMultiUserTodoTodoHistory } from "@ORGANIZATION/PROJECT-api/lib/structures/IMultiUserTodoTodoHistory";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import typia, { tags } from "typia";

import { toISOStringSafe } from "../utils/toISOStringSafe";
import { MultiUserTodoMemberAtSummaryTransformer } from "./MultiUserTodoMemberAtSummaryTransformer";

export namespace MultiUserTodoTodoHistoryTransformer {
  export type Payload = Prisma.multi_user_todo_todo_historiesGetPayload<
    ReturnType<typeof select>
  >;
  export function select() {
    return {
      select: {
        id: true,
        changed_at: true,
        title: true,
        description: true,
        start_date: true,
        due_date: true,
        created_at: true,
        updated_at: true,
        deleted_at: true,
        member: MultiUserTodoMemberAtSummaryTransformer.select(),
      },
    } satisfies Prisma.multi_user_todo_todo_historiesFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<IMultiUserTodoTodoHistory> {
    return {
      id: input.id,
      member: await MultiUserTodoMemberAtSummaryTransformer.transform(
        input.member,
      ),
      changed_at: input.changed_at.toISOString(),
      title: input.title ?? null,
      description: input.description ?? null,
      start_date: input.start_date?.toISOString() ?? null,
      due_date: input.due_date?.toISOString() ?? null,
      created_at: input.created_at.toISOString(),
      updated_at: input.updated_at.toISOString(),
      deleted_at: input.deleted_at?.toISOString() ?? null,
    };
  }
}
