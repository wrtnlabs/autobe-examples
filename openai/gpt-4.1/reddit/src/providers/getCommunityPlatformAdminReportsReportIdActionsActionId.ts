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

export async function getCommunityPlatformAdminReportsReportIdActionsActionId(props: {
  admin: AdminPayload;
  reportId: string & tags.Format<"uuid">;
  actionId: string & tags.Format<"uuid">;
}): Promise<ICommunityPlatformReportActions> {
  const action =
    await MyGlobal.prisma.community_platform_report_actions.findFirst({
      where: {
        id: props.actionId,
        report_id: props.reportId,
      },
    });

  if (action === null) {
    throw new HttpException("Report action not found", 404);
  }
  if (action.actor_admin_id === null) {
    throw new HttpException("Report action actor_admin_id is null", 500);
  }
  return {
    id: action.id,
    report_id: action.report_id,
    actor_admin_id: action.actor_admin_id satisfies string as string &
      tags.Format<"uuid">,
    action_type: typia.assert<
      | "comment"
      | "status_update"
      | "auto_hide"
      | "assign"
      | "resolve"
      | "dismiss"
    >(action.action_type),
    old_status: action.old_status === null ? undefined : action.old_status,
    new_status: action.new_status === null ? undefined : action.new_status,
    comment: action.comment === null ? undefined : action.comment,
    created_at: toISOStringSafe(action.created_at),
  };
}
