import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IMultiUserTodoMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IMultiUserTodoMember";
import { IMultiUserTodoTodo } from "@ORGANIZATION/PROJECT-api/lib/structures/IMultiUserTodoTodo";
import { IMultiUserTodoTodoViewStat } from "@ORGANIZATION/PROJECT-api/lib/structures/IMultiUserTodoTodoViewStat";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import typia, { tags } from "typia";

import { toISOStringSafe } from "../utils/toISOStringSafe";
import { MultiUserTodoMemberAtSummaryTransformer } from "./MultiUserTodoMemberAtSummaryTransformer";
import { MultiUserTodoTodoAtSummaryTransformer } from "./MultiUserTodoTodoAtSummaryTransformer";

export namespace MultiUserTodoTodoViewStatAtSummaryTransformer {
  export type Payload = Prisma.multi_user_todo_todo_view_statsGetPayload<
    ReturnType<typeof select>
  >;
  export function select() {
    return {
      select: {
        id: true,
        view_type: true,
        created_at: true,
        member: MultiUserTodoMemberAtSummaryTransformer.select(),
        todo: MultiUserTodoTodoAtSummaryTransformer.select(),
      },
    } satisfies Prisma.multi_user_todo_todo_view_statsFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<IMultiUserTodoTodoViewStat.ISummary> {
    return {
      id: input.id,
      view_type: input.view_type,
      created_at: input.created_at.toISOString(),
      member: await MultiUserTodoMemberAtSummaryTransformer.transform(
        input.member,
      ),
      todo: input.todo
        ? await MultiUserTodoTodoAtSummaryTransformer.transform(input.todo)
        : null,
    };
  }
}
