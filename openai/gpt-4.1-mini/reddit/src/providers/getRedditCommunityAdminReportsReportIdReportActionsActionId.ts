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

export async function getRedditCommunityAdminReportsReportIdReportActionsActionId(props: {
  admin: AdminPayload;
  reportId: string & tags.Format<"uuid">;
  actionId: string & tags.Format<"uuid">;
}): Promise<IRedditCommunityReportAction> {
  const { reportId, actionId } = props;

  const found = await MyGlobal.prisma.reddit_community_report_actions.findFirst(
    {
      where: {
        id: actionId,
        report_id: reportId,
        deleted_at: null,
      },
      include: {
        report: true,
        moderatorMember: true,
        adminMember: true,
      },
    },
  );

  if (!found) {
    throw new HttpException("Report action not found", 404);
  }

  return {
    id: found.id,
    report_id: found.report_id,
    moderator_member_id: found.moderator_member_id,
    admin_member_id: found.admin_member_id ?? null,
    action_type: found.action_type,
    notes: found.notes ?? null,
    created_at: toISOStringSafe(found.created_at),
    updated_at: toISOStringSafe(found.updated_at),
    deleted_at:
      found.deleted_at === null ? null : toISOStringSafe(found.deleted_at),
    report: undefined, // Removed incompatible report property
    moderatorMember:
      found.moderatorMember === null
        ? undefined
        : {
            id: found.moderatorMember.id,
            email: found.moderatorMember.email,
            is_email_verified: found.moderatorMember.is_email_verified,
            created_at: toISOStringSafe(found.moderatorMember.created_at),
            updated_at: toISOStringSafe(found.moderatorMember.updated_at),
            deleted_at:
              found.moderatorMember.deleted_at === null
                ? null
                : toISOStringSafe(found.moderatorMember.deleted_at),
          },
    adminMember:
      found.adminMember === null
        ? null
        : {
            id: found.adminMember.id,
            email: found.adminMember.email,
            admin_level: found.adminMember.admin_level,
            created_at: toISOStringSafe(found.adminMember.created_at),
            updated_at: toISOStringSafe(found.adminMember.updated_at),
            deleted_at:
              found.adminMember.deleted_at === null
                ? null
                : toISOStringSafe(found.adminMember.deleted_at),
          },
  };
}
