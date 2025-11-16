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

export async function putTodoAppAdminAlertsAlertId(props: {
  admin: AdminPayload;
  alertId: string & tags.Format<"uuid">;
  body: ITodoAppAlert.IUpdate;
}): Promise<ITodoAppAlert> {
  // Verify alert exists
  const existingAlert = await MyGlobal.prisma.todo_app_alert.findUnique({
    where: { id: props.alertId },
  });

  if (!existingAlert) {
    throw new HttpException("Alert not found", 404);
  }

  // Update the alert with provided fields
  const updated = await MyGlobal.prisma.todo_app_alert.update({
    where: { id: props.alertId },
    data: {
      ...(props.body.status !== undefined && { status: props.body.status }),
      ...(props.body.acknowledged_at !== undefined && {
        acknowledged_at: props.body.acknowledged_at
          ? new Date(props.body.acknowledged_at)
          : null,
      }),
      ...(props.body.resolved_at !== undefined && {
        resolved_at: props.body.resolved_at
          ? new Date(props.body.resolved_at)
          : null,
      }),
    },
  });

  // Return updated alert with proper formatting
  return {
    id: updated.id,
    alert_type: updated.alert_type,
    severity: typia.assert<"info" | "warning" | "critical">(updated.severity),
    title: updated.title,
    description: updated.description,
    metric_name: updated.metric_name === null ? undefined : updated.metric_name,
    metric_value:
      updated.metric_value === null ? undefined : updated.metric_value,
    threshold_value:
      updated.threshold_value === null ? undefined : updated.threshold_value,
    context_data:
      updated.context_data === null ? undefined : updated.context_data,
    todo_app_audit_log_id:
      updated.todo_app_audit_log_id === null
        ? undefined
        : updated.todo_app_audit_log_id,
    status: typia.assert<"open" | "acknowledged" | "resolved">(updated.status),
    acknowledged_at: updated.acknowledged_at
      ? toISOStringSafe(updated.acknowledged_at)
      : undefined,
    resolved_at: updated.resolved_at
      ? toISOStringSafe(updated.resolved_at)
      : undefined,
    created_at: toISOStringSafe(updated.created_at),
  };
}
