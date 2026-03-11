import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IMultiUserTodoMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IMultiUserTodoMember";
import { IMultiUserTodoTodo } from "@ORGANIZATION/PROJECT-api/lib/structures/IMultiUserTodoTodo";
import { IMultiUserTodoTodoViewStat } from "@ORGANIZATION/PROJECT-api/lib/structures/IMultiUserTodoTodoViewStat";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageIMultiUserTodoTodoViewStat } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIMultiUserTodoTodoViewStat";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { MemberPayload } from "../decorators/payload/MemberPayload";
import { MultiUserTodoTodoViewStatAtSummaryTransformer } from "../transformers/MultiUserTodoTodoViewStatAtSummaryTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchMultiUserTodoMemberViewStats(props: {
  member: MemberPayload;
  body: IMultiUserTodoTodoViewStat.IRequest;
}): Promise<IPageIMultiUserTodoTodoViewStat.ISummary> {
  // Extract pagination parameters
  const page = props.body.page ?? 1;
  const limit = props.body.limit ?? 20;
  const skip = (page - 1) * limit;
  // Build WHERE clause
  const whereInput = {
    // Member can only see their own view stats
    multi_user_todo_member_id: props.member.id,
    // Optional date range filtering - handle both date and datetime properly
    ...(props.body.start_date && props.body.end_date
      ? {
          created_at: {
            gte: new Date(props.body.start_date),
            lte: new Date(props.body.end_date),
          },
        }
      : props.body.start_date
        ? { created_at: { gte: new Date(props.body.start_date) } }
        : props.body.end_date
          ? { created_at: { lte: new Date(props.body.end_date) } }
          : {}),
    // Optional view_type filtering
    ...(props.body.view_type && { view_type: props.body.view_type }),
  } satisfies Prisma.multi_user_todo_todo_view_statsWhereInput;
  // Execute queries - use consecutive awaits instead of Promise.all for proper transaction semantics
  const data = await MyGlobal.prisma.multi_user_todo_todo_view_stats.findMany({
    where: whereInput,
    skip,
    take: limit,
    orderBy: { created_at: "desc" as const },
    ...MultiUserTodoTodoViewStatAtSummaryTransformer.select(),
  });
  const total = await MyGlobal.prisma.multi_user_todo_todo_view_stats.count({
    where: whereInput,
  });
  // Transform data using transformer
  const transformedData = await ArrayUtil.asyncMap(
    data,
    MultiUserTodoTodoViewStatAtSummaryTransformer.transform,
  );
  return {
    data: transformedData,
    pagination: {
      current: page,
      limit: limit,
      records: total,
      pages: Math.ceil(total / limit),
    } satisfies IPage.IPagination,
  };
}
