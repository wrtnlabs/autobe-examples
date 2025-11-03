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

export async function postCommunityPlatformAdminReportsReportIdActions(props: {
  admin: AdminPayload;
  reportId: string & tags.Format<"uuid">;
  body: ICommunityPlatformReportActions.ICreate;
}): Promise<ICommunityPlatformReportActions> {
  const report = await MyGlobal.prisma.community_platform_reports.findUnique({
    where: { id: props.reportId },
  });
  if (!report || report.deleted_at !== null) {
    throw new HttpException("Report not found", 404);
  }
  const now = toISOStringSafe(new Date());
  const created =
    await MyGlobal.prisma.community_platform_report_actions.create({
      data: {
        id: v4(),
        report_id: props.reportId,
        actor_admin_id: props.admin.id,
        action_type: props.body.action_type,
        old_status: props.body.old_status ?? undefined,
        new_status: props.body.new_status ?? undefined,
        comment: props.body.comment ?? undefined,
        created_at: now,
      },
    });
  return {
    id: created.id,
    report_id: created.report_id,
    actor_admin_id:
      created.actor_admin_id !== null && created.actor_admin_id !== undefined
        ? (created.actor_admin_id satisfies string as string)
        : (() => {
            throw new HttpException("Missing actor admin id", 500);
          })(),
    action_type: typia.assert<
      | "comment"
      | "status_update"
      | "auto_hide"
      | "assign"
      | "resolve"
      | "dismiss"
    >(created.action_type),
    old_status: created.old_status ?? undefined,
    new_status: created.new_status ?? undefined,
    comment: created.comment ?? undefined,
    created_at: toISOStringSafe(created.created_at),
  };
}
