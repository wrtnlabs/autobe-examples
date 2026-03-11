import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IMultiUserTodoBackupLog } from "@ORGANIZATION/PROJECT-api/lib/structures/IMultiUserTodoBackupLog";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageIMultiUserTodoBackupLog } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIMultiUserTodoBackupLog";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { AdminPayload } from "../decorators/payload/AdminPayload";
import { MultiUserTodoBackupLogAtSummaryTransformer } from "../transformers/MultiUserTodoBackupLogAtSummaryTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchMultiUserTodoAdminBackupLogs(props: {
  admin: AdminPayload;
  body: IMultiUserTodoBackupLog.IRequest;
}): Promise<IPageIMultiUserTodoBackupLog.ISummary> {
  // Parse pagination parameters
  const page = props.body.page ?? 1;
  const limit = props.body.limit ?? 100;
  const skip = (page - 1) * limit;
  // Build WHERE clause
  const whereInput: Prisma.multi_user_todo_backup_logsWhereInput = {
    ...(props.body.backup_type !== undefined &&
      props.body.backup_type !== null && {
        backup_type: props.body.backup_type,
      }),
    ...(props.body.status !== undefined &&
      props.body.status !== null && { status: props.body.status }),
    ...(props.body.recovery_point_id !== undefined &&
      props.body.recovery_point_id !== null && {
        recovery_point_id: props.body.recovery_point_id,
      }),
    ...(props.body.started_after !== undefined &&
      props.body.started_after !== null && {
        started_at: { gte: new Date(props.body.started_after) },
      }),
    ...(props.body.started_before !== undefined &&
      props.body.started_before !== null && {
        started_at: { lte: new Date(props.body.started_before) },
      }),
    ...(props.body.completed_after !== undefined &&
      props.body.completed_after !== null && {
        completed_at: { gte: new Date(props.body.completed_after) },
      }),
    ...(props.body.completed_before !== undefined &&
      props.body.completed_before !== null && {
        completed_at: { lte: new Date(props.body.completed_before) },
      }),
  } satisfies Prisma.multi_user_todo_backup_logsWhereInput;
  // Determine sorting
  const sortField = props.body.sort ?? "started_at";
  const sortDirection = props.body.direction ?? "desc";
  const orderByInput = {
    [sortField]: sortDirection,
  } satisfies Prisma.multi_user_todo_backup_logsOrderByWithRelationInput;
  // Execute queries
  const [data, total] = await Promise.all([
    MyGlobal.prisma.multi_user_todo_backup_logs.findMany({
      where: whereInput,
      skip,
      take: limit,
      orderBy: orderByInput,
      ...MultiUserTodoBackupLogAtSummaryTransformer.select(),
    }),
    MyGlobal.prisma.multi_user_todo_backup_logs.count({
      where: whereInput,
    }),
  ]);
  // Transform results
  const transformedData = await ArrayUtil.asyncMap(
    data,
    MultiUserTodoBackupLogAtSummaryTransformer.transform,
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
