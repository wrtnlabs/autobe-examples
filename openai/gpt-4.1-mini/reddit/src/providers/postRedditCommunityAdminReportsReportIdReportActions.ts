import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IRedditCommunityReportAction } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityReportAction";
import { IRedditCommunityMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityMember";
import { IRedditCommunityAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityAdmin";
import { AdminPayload } from "../decorators/payload/AdminPayload";

export async function postRedditCommunityAdminReportsReportIdReportActions(props: {
  admin: AdminPayload;
  reportId: string & tags.Format<"uuid">;
  body: IRedditCommunityReportAction.ICreate;
}): Promise<IRedditCommunityReportAction> {
  const { admin, reportId, body } = props;

  // Confirm the report exists
  const report = await MyGlobal.prisma.reddit_community_reports.findUnique({
    where: { id: reportId },
  });

  if (report === null) {
    throw new HttpException("Report not found", 404);
  }

  // Confirm the moderator member exists
  const moderator = await MyGlobal.prisma.reddit_community_members.findUnique({
    where: { id: body.moderator_member_id },
  });

  if (moderator === null) {
    throw new HttpException("Moderator member not found", 404);
  }

  // If admin_member_id is provided, confirm admin exists
  if (body.admin_member_id !== undefined && body.admin_member_id !== null) {
    const adminMember =
      await MyGlobal.prisma.reddit_community_admins.findUnique({
        where: { id: body.admin_member_id },
      });

    if (adminMember === null) {
      throw new HttpException("Admin member not found", 404);
    }
  }

  // Use current time if created_at or updated_at is missing
  const now = toISOStringSafe(new Date()) as string & tags.Format<"date-time">;

  // Create the report action
  const created = await MyGlobal.prisma.reddit_community_report_actions.create({
    data: {
      id: v4() as string & tags.Format<"uuid">,
      report_id: reportId,
      moderator_member_id: body.moderator_member_id,
      admin_member_id: body.admin_member_id ?? null,
      action_type: body.action_type,
      notes: body.notes ?? null,
      created_at: body.created_at ?? now,
      updated_at: body.updated_at ?? now,
    },
  });

  // Return with proper date string conversion
  return {
    id: created.id,
    report_id: created.report_id,
    moderator_member_id: created.moderator_member_id,
    admin_member_id: created.admin_member_id ?? null,
    action_type: created.action_type,
    notes: created.notes ?? null,
    created_at: toISOStringSafe(created.created_at),
    updated_at: toISOStringSafe(created.updated_at),
    deleted_at: created.deleted_at ? toISOStringSafe(created.deleted_at) : null,
  };
}
