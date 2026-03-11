import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IMultiUserTodoAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IMultiUserTodoAdmin";
import { IMultiUserTodoAdminSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IMultiUserTodoAdminSession";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageIMultiUserTodoAdminSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIMultiUserTodoAdminSession";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { AdminPayload } from "../decorators/payload/AdminPayload";
import { MultiUserTodoAdminSessionAtSummaryTransformer } from "../transformers/MultiUserTodoAdminSessionAtSummaryTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

// DON'T CHANGE FUNCTION NAME AND PARAMETERS,
// ONLY YOU HAVE TO WRITE THIS FUNCTION BODY, AND USE IMPORTED.
export async function patchMultiUserTodoAdminAdminsSessions(props: {
  admin: AdminPayload;
  body: IMultiUserTodoAdminSession.IRequest;
}): Promise<IPageIMultiUserTodoAdminSession.ISummary> {
  // Verify admin exists and is active
  await MyGlobal.prisma.multi_user_todo_admins.findUniqueOrThrow({
    where: {
      id: props.admin.id,
      deleted_at: null,
    },
  });
  // Build WHERE clause for filtering
  const page = props.body.page ?? 1;
  const limit = props.body.limit ?? 100;
  const skip = (page - 1) * limit;
  // Validate pagination parameters
  if (page < 1) {
    throw new HttpException("Page must be at least 1", 400);
  }
  if (limit < 1 || limit > 100) {
    throw new HttpException("Limit must be between 1 and 100", 400);
  }
  // Build date range condition efficiently
  const dateRangeCondition: Prisma.multi_user_todo_admin_sessionsWhereInput =
    {};
  if (props.body.created_at_start || props.body.created_at_end) {
    const dateRange: Prisma.DateTimeFilter = {};
    if (props.body.created_at_start) {
      dateRange.gte = new Date(props.body.created_at_start);
    }
    if (props.body.created_at_end) {
      dateRange.lte = new Date(props.body.created_at_end);
    }
    dateRangeCondition.created_at = dateRange;
  }
  const whereClause = {
    ...(props.body.multi_user_todo_admin_id && {
      multi_user_todo_admin_id: props.body.multi_user_todo_admin_id,
    }),
    ...dateRangeCondition,
    ...(props.body.ip && {
      ip: {
        contains: props.body.ip,
        mode: "insensitive" as const,
      },
    }),
  } satisfies Prisma.multi_user_todo_admin_sessionsWhereInput;
  // Query for paginated data
  const data = await MyGlobal.prisma.multi_user_todo_admin_sessions.findMany({
    where: whereClause,
    skip,
    take: limit,
    orderBy: { created_at: "desc" as const },
    ...MultiUserTodoAdminSessionAtSummaryTransformer.select(),
  });
  // Query for total count
  const total = await MyGlobal.prisma.multi_user_todo_admin_sessions.count({
    where: whereClause,
  });
  // Transform data using transformer
  const transformedData = await ArrayUtil.asyncMap(
    data,
    MultiUserTodoAdminSessionAtSummaryTransformer.transform,
  );
  // Calculate pagination metadata
  const pages = total > 0 ? Math.ceil(total / limit) : 0;
  // Return paginated response
  return {
    data: transformedData,
    pagination: {
      current: page,
      limit: limit,
      records: total,
      pages: pages,
    } satisfies IPage.IPagination,
  } satisfies IPageIMultiUserTodoAdminSession.ISummary;
}
