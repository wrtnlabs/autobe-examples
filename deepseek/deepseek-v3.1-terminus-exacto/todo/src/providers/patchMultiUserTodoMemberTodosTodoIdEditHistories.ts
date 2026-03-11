import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IMultiUserTodoEditHistory } from "@ORGANIZATION/PROJECT-api/lib/structures/IMultiUserTodoEditHistory";
import { IMultiUserTodoMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IMultiUserTodoMember";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageIMultiUserTodoEditHistory } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIMultiUserTodoEditHistory";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { MemberPayload } from "../decorators/payload/MemberPayload";
import { MultiUserTodoEditHistoryAtSummaryTransformer } from "../transformers/MultiUserTodoEditHistoryAtSummaryTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchMultiUserTodoMemberTodosTodoIdEditHistories(props: {
  member: MemberPayload;
  todoId: string & tags.Format<"uuid">;
  body: IMultiUserTodoEditHistory.IRequest;
}): Promise<IPageIMultiUserTodoEditHistory.ISummary> {
  // 1. Verify todo ownership
  const todo = await MyGlobal.prisma.multi_user_todo_todos.findFirstOrThrow({
    where: {
      id: props.todoId,
      multi_user_todo_member_id: props.member.id,
      deleted_at: null,
    },
    select: { id: true },
  });
  // 2. Build base WHERE clause
  const whereInput: Prisma.multi_user_todo_edit_historiesWhereInput = {
    multi_user_todo_todo_id: props.todoId,
    ...(props.body.start_date && {
      created_at: { gte: new Date(props.body.start_date) },
    }),
    ...(props.body.end_date && {
      created_at: { lte: new Date(props.body.end_date) },
    }),
    ...(props.body.editor_id && {
      multi_user_todo_member_id: props.body.editor_id,
    }),
  };
  // 3. Handle text search via fieldChanges JOIN
  if (props.body.search) {
    whereInput.fieldChanges = {
      some: {
        OR: [
          { field_name: "title", new_value: { contains: props.body.search } },
          {
            field_name: "description",
            new_value: { contains: props.body.search },
          },
        ],
      },
    };
  }
  // 4. Pagination
  const page = props.body.page ?? 1;
  const limit = props.body.limit ?? 100;
  const skip = (page - 1) * limit;
  // 5. Fetch paginated data with transformer select
  const data = await MyGlobal.prisma.multi_user_todo_edit_histories.findMany({
    where: whereInput,
    orderBy: { created_at: "desc" },
    skip,
    take: limit,
    ...MultiUserTodoEditHistoryAtSummaryTransformer.select(),
  });
  // 6. Count total matches
  const total = await MyGlobal.prisma.multi_user_todo_edit_histories.count({
    where: whereInput,
  });
  // 7. Transform data
  const transformed = await ArrayUtil.asyncMap(
    data,
    MultiUserTodoEditHistoryAtSummaryTransformer.transform,
  );
  return {
    data: transformed,
    pagination: {
      current: page,
      limit: limit,
      records: total,
      pages: Math.ceil(total / limit),
    } satisfies IPage.IPagination,
  };
}
