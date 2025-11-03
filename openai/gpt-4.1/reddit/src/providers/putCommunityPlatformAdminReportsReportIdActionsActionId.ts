import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { ICommunityPlatformReportActions } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformReportActions";
import { AdminPayload } from "../decorators/payload/AdminPayload";

export async function putCommunityPlatformAdminReportsReportIdActionsActionId(props: {
  admin: AdminPayload;
  reportId: string & tags.Format<"uuid">;
  actionId: string & tags.Format<"uuid">;
  body: ICommunityPlatformReportActions.IUpdate;
}): Promise<ICommunityPlatformReportActions> {
  const { admin, reportId, actionId, body } = props;

  // Find the existing action (must match by reportId and actionId)
  const record =
    await MyGlobal.prisma.community_platform_report_actions.findFirst({
      where: {
        id: actionId,
        report_id: reportId,
      },
    });
  if (!record) {
    throw new HttpException("Report action not found", 404);
  }

  // Finalized actions cannot be updated
  if (record.action_type === "resolve" || record.action_type === "dismiss") {
    throw new HttpException(
      "Finalized moderation actions cannot be modified",
      403,
    );
  }

  // Only these fields are updatable
  const data = {
    ...(typeof body.comment !== "undefined" && { comment: body.comment }),
    ...(typeof body.new_status !== "undefined" && {
      new_status: body.new_status,
    }),
  };
  if (Object.keys(data).length === 0) {
    throw new HttpException("No updatable fields provided", 400);
  }

  const updated =
    await MyGlobal.prisma.community_platform_report_actions.update({
      where: { id: actionId },
      data,
    });
  if (updated.actor_admin_id === null) {
    throw new HttpException("actor_admin_id is required but was null", 500);
  }
  return {
    id: updated.id,
    report_id: updated.report_id,
    actor_admin_id: updated.actor_admin_id satisfies string as string,
    action_type: typia.assert<
      | "comment"
      | "status_update"
      | "auto_hide"
      | "assign"
      | "resolve"
      | "dismiss"
    >(updated.action_type),
    old_status:
      typeof updated.old_status === "undefined"
        ? undefined
        : updated.old_status,
    new_status:
      typeof updated.new_status === "undefined"
        ? undefined
        : updated.new_status,
    comment:
      typeof updated.comment === "undefined" ? undefined : updated.comment,
    created_at: toISOStringSafe(updated.created_at),
  };
}
