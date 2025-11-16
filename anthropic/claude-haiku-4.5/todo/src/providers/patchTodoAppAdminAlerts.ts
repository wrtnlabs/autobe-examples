import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { ITodoAppAlert } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppAlert";
import { IPageITodoAppAlert } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageITodoAppAlert";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { AdminPayload } from "../decorators/payload/AdminPayload";

export async function patchTodoAppAdminAlerts(props: {
  admin: AdminPayload;
  body: ITodoAppAlert.IRequest;
}): Promise<IPageITodoAppAlert.ISummary> {
  const { skip, take, alert_type, severity, status } = props.body;

  // Build where condition with optional filters
  const whereCondition: Record<string, unknown> = {};

  if (alert_type) {
    whereCondition.alert_type = alert_type;
  }

  if (severity) {
    whereCondition.severity = severity;
  }

  if (status) {
    whereCondition.status = status;
  }

  // Execute concurrent queries for data and total count
  const [alerts, total] = await Promise.all([
    MyGlobal.prisma.todo_app_alert.findMany({
      where: whereCondition,
      skip,
      take,
      orderBy: { created_at: "desc" },
    }),
    MyGlobal.prisma.todo_app_alert.count({
      where: whereCondition,
    }),
  ]);

  // Transform alerts to summary format
  const alertSummaries: ITodoAppAlert.ISummary[] = alerts.map((alert) => ({
    id: alert.id as string & tags.Format<"uuid">,
    alert_type: alert.alert_type,
    severity: alert.severity as "info" | "warning" | "critical",
    title: alert.title,
    status: alert.status as "open" | "acknowledged" | "resolved",
    created_at: toISOStringSafe(alert.created_at),
  }));

  // Calculate pagination metadata
  const current = Math.floor(skip / take);
  const pages = Math.ceil(total / take);

  return {
    pagination: {
      current,
      limit: take,
      records: total,
      pages,
    },
    data: alertSummaries,
  };
}
