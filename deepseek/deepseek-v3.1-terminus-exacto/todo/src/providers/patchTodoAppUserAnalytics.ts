import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageITodoAppAuditLog } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageITodoAppAuditLog";
import { ITodoAppAuditLog } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppAuditLog";
import { ITodoAppUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppUser";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { UserPayload } from "../decorators/payload/UserPayload";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchTodoAppUserAnalytics(props: {
  user: UserPayload;
  body: ITodoAppAuditLog.IRequest;
}): Promise<IPageITodoAppAuditLog> {
  const page = props.body.page ?? 1;
  const limit = props.body.limit ?? 100;
  const skip = (page - 1) * limit;
  // Build WHERE clause with user_id filtering and optional filters
  const whereInput = {
    user_id: props.user.id,
    ...(props.body.event_type && { event_type: props.body.event_type }),
    ...(props.body.event_subtype && {
      event_subtype: props.body.event_subtype,
    }),
    ...(props.body.start_date &&
      props.body.end_date && {
        created_at: {
          gte: new Date(props.body.start_date),
          lte: new Date(props.body.end_date),
        },
      }),
  } satisfies Prisma.todo_app_audit_logsWhereInput;
  // Get paginated data with proper select clause
  const data = await MyGlobal.prisma.todo_app_audit_logs.findMany({
    where: whereInput,
    skip,
    take: limit,
    orderBy: { created_at: "desc" },
    select: {
      id: true,
      event_type: true,
      event_subtype: true,
      severity: true,
      description: true,
      ip_address: true,
      user_agent: true,
      resource_id: true,
      resource_type: true,
      metadata: true,
      created_at: true,
      updated_at: true,
      user: {
        select: {
          id: true,
          email: true,
          display_name: true,
          created_at: true,
        },
      } satisfies Prisma.todo_app_usersFindManyArgs,
    },
  });
  // Get total count
  const total = await MyGlobal.prisma.todo_app_audit_logs.count({
    where: whereInput,
  });
  // Transform data to match ITodoAppAuditLog structure
  const transformedData = data.map(
    (record) =>
      ({
        id: record.id,
        event_type: record.event_type,
        event_subtype:
          record.event_subtype === null ? undefined : record.event_subtype,
        severity: record.severity,
        description: record.description,
        ip_address: record.ip_address === null ? undefined : record.ip_address,
        user_agent: record.user_agent === null ? undefined : record.user_agent,
        resource_id:
          record.resource_id === null ? undefined : record.resource_id,
        resource_type:
          record.resource_type === null ? undefined : record.resource_type,
        metadata: record.metadata === null ? undefined : record.metadata,
        created_at: record.created_at.toISOString(),
        updated_at: record.updated_at.toISOString(),
        user: record.user
          ? ({
              id: record.user.id,
              email: record.user.email,
              display_name: record.user.display_name,
              created_at: record.user.created_at.toISOString(),
            } satisfies ITodoAppUser.ISummary)
          : undefined,
      }) satisfies ITodoAppAuditLog,
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
