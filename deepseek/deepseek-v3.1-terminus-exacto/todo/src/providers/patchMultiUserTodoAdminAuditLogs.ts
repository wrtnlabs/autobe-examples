import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IMultiUserTodoAuditLog } from "@ORGANIZATION/PROJECT-api/lib/structures/IMultiUserTodoAuditLog";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageIMultiUserTodoAuditLog } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIMultiUserTodoAuditLog";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { AdminPayload } from "../decorators/payload/AdminPayload";
import { MultiUserTodoAuditLogAtSummaryTransformer } from "../transformers/MultiUserTodoAuditLogAtSummaryTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchMultiUserTodoAdminAuditLogs(props: {
  admin: AdminPayload;
  body: IMultiUserTodoAuditLog.IRequest;
}): Promise<IPageIMultiUserTodoAuditLog.ISummary> {
  const page = props.body.page ?? 1;
  const limit = props.body.limit ?? 100;
  const skip = (page - 1) * limit;
  // Build WHERE conditions
  const whereConditions: Prisma.multi_user_todo_audit_logsWhereInput = {};
  if (props.body.event_type !== undefined) {
    whereConditions.event_type = props.body.event_type;
  }
  if (props.body.actor_type !== undefined) {
    whereConditions.actor_type = props.body.actor_type;
  }
  if (props.body.success_flag !== undefined) {
    whereConditions.success_flag = props.body.success_flag;
  }
  // Handle created_at range filtering
  if (
    props.body.created_at_start !== undefined ||
    props.body.created_at_end !== undefined
  ) {
    whereConditions.created_at = {};
    if (props.body.created_at_start !== undefined) {
      whereConditions.created_at.gte = new Date(props.body.created_at_start);
    }
    if (props.body.created_at_end !== undefined) {
      whereConditions.created_at.lte = new Date(props.body.created_at_end);
    }
  }
  // Handle nullable foreign key filters
  if (props.body.multi_user_todo_member_id !== undefined) {
    if (props.body.multi_user_todo_member_id === null) {
      whereConditions.multi_user_todo_member_id = null;
    } else {
      whereConditions.multi_user_todo_member_id =
        props.body.multi_user_todo_member_id;
    }
  }
  if (props.body.multi_user_todo_admin_id !== undefined) {
    if (props.body.multi_user_todo_admin_id === null) {
      whereConditions.multi_user_todo_admin_id = null;
    } else {
      whereConditions.multi_user_todo_admin_id =
        props.body.multi_user_todo_admin_id;
    }
  }
  // Calculate total count first for pagination metadata
  const total = await MyGlobal.prisma.multi_user_todo_audit_logs.count({
    where: whereConditions,
  });
  // Fetch paginated data
  const data = await MyGlobal.prisma.multi_user_todo_audit_logs.findMany({
    where: whereConditions,
    skip,
    take: limit,
    orderBy: { created_at: "desc" },
    ...MultiUserTodoAuditLogAtSummaryTransformer.select(),
  });
  return {
    data: await ArrayUtil.asyncMap(
      data,
      MultiUserTodoAuditLogAtSummaryTransformer.transform,
    ),
    pagination: {
      current: page,
      limit: limit,
      records: total,
      pages: Math.ceil(total / limit),
    } satisfies IPage.IPagination,
  };
}
