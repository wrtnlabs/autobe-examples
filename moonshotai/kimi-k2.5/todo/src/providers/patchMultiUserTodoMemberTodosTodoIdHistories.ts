import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IMultiUserTodoHistory } from "@ORGANIZATION/PROJECT-api/lib/structures/IMultiUserTodoHistory";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageIMultiUserTodoHistory } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIMultiUserTodoHistory";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { MemberPayload } from "../decorators/payload/MemberPayload";
import { MultiUserTodoHistoryAtSummaryTransformer } from "../transformers/MultiUserTodoHistoryAtSummaryTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchMultiUserTodoMemberTodosTodoIdHistories(props: {
  member: MemberPayload;
  todoId: string & tags.Format<"uuid">;
  body: IMultiUserTodoHistory.IRequest;
}): Promise<IPageIMultiUserTodoHistory.ISummary> {
  // Verify todo exists and member owns it
  const todo = await MyGlobal.prisma.multi_user_todo_todos.findFirstOrThrow({
    where: {
      id: props.todoId,
      member_id: props.member.id,
    },
    select: { id: true },
  });
  // Pagination parameters
  const page = props.body.page ?? 1;
  const limit = props.body.limit ?? 20;
  const skip = (page - 1) * limit;
  // Query history entries with pagination
  const histories = await MyGlobal.prisma.multi_user_todo_histories.findMany({
    where: {
      todo_id: props.todoId,
    },
    skip,
    take: limit,
    orderBy: {
      created_at: "desc",
    },
    ...MultiUserTodoHistoryAtSummaryTransformer.select(),
  });
  // Count total history entries
  const total = await MyGlobal.prisma.multi_user_todo_histories.count({
    where: {
      todo_id: props.todoId,
    },
  });
  // Transform results
  const transformed = await ArrayUtil.asyncMap(
    histories,
    MultiUserTodoHistoryAtSummaryTransformer.transform,
  );
  // Calculate pagination
  const pages = Math.ceil(total / limit);
  return {
    data: transformed,
    pagination: {
      current: page,
      limit: limit,
      records: total,
      pages: pages,
    } satisfies IPage.IPagination,
  };
}
