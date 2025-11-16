import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { ITodoAppAlert } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppAlert";
import { AdminPayload } from "../decorators/payload/AdminPayload";

export async function getTodoAppAdminAlertsAlertId(props: {
  admin: AdminPayload;
  alertId: string & tags.Format<"uuid">;
}): Promise<ITodoAppAlert> {
  const alert = await MyGlobal.prisma.todo_app_alert.findUnique({
    where: { id: props.alertId },
  });

  if (!alert) {
    throw new HttpException("Alert not found", 404);
  }

  const severity: "info" | "warning" | "critical" =
    alert.severity === "info" ||
    alert.severity === "warning" ||
    alert.severity === "critical"
      ? (alert.severity as "info" | "warning" | "critical")
      : "warning";

  const status: "open" | "acknowledged" | "resolved" =
    alert.status === "open" ||
    alert.status === "acknowledged" ||
    alert.status === "resolved"
      ? (alert.status as "open" | "acknowledged" | "resolved")
      : "open";

  return {
    id: alert.id,
    alert_type: alert.alert_type,
    severity,
    title: alert.title,
    description: alert.description,
    metric_name: alert.metric_name === null ? undefined : alert.metric_name,
    metric_value: alert.metric_value === null ? undefined : alert.metric_value,
    threshold_value:
      alert.threshold_value === null ? undefined : alert.threshold_value,
    context_data: alert.context_data === null ? undefined : alert.context_data,
    todo_app_audit_log_id:
      alert.todo_app_audit_log_id === null
        ? undefined
        : alert.todo_app_audit_log_id,
    status,
    acknowledged_at:
      alert.acknowledged_at === null
        ? undefined
        : toISOStringSafe(alert.acknowledged_at),
    resolved_at:
      alert.resolved_at === null
        ? undefined
        : toISOStringSafe(alert.resolved_at),
    created_at: toISOStringSafe(alert.created_at),
  };
}
