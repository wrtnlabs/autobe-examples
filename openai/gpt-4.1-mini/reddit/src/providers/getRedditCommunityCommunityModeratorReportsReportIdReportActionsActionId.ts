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
import { CommunitymoderatorPayload } from "../decorators/payload/CommunitymoderatorPayload";

export async function getRedditCommunityCommunityModeratorReportsReportIdReportActionsActionId(props: {
  communityModerator: CommunitymoderatorPayload;
  reportId: string & tags.Format<"uuid">;
  actionId: string & tags.Format<"uuid">;
}): Promise<IRedditCommunityReportAction> {
  const { communityModerator, reportId, actionId } = props;

  const reportAction =
    await MyGlobal.prisma.reddit_community_report_actions.findFirst({
      where: {
        id: actionId,
        report_id: reportId,
        moderator_member_id: communityModerator.id,
        deleted_at: null,
      },
      include: {
        moderatorMember: {
          select: {
            id: true,
            email: true,
            is_email_verified: true,
            created_at: true,
            updated_at: true,
            deleted_at: true,
          },
        },
        adminMember: {
          select: {
            id: true,
            email: true,
            admin_level: true,
            created_at: true,
            updated_at: true,
            deleted_at: true,
          },
        },
      },
    });

  if (!reportAction) {
    throw new HttpException("Not Found", 404);
  }

  return {
    id: reportAction.id,
    report_id: reportAction.report_id,
    moderator_member_id: reportAction.moderator_member_id,
    admin_member_id: reportAction.admin_member_id ?? null,
    action_type: reportAction.action_type,
    notes: reportAction.notes ?? null,
    created_at: toISOStringSafe(reportAction.created_at),
    updated_at: toISOStringSafe(reportAction.updated_at),
    deleted_at: reportAction.deleted_at
      ? toISOStringSafe(reportAction.deleted_at)
      : null,
    moderatorMember: reportAction.moderatorMember
      ? {
          id: reportAction.moderatorMember.id,
          email: reportAction.moderatorMember.email,
          is_email_verified: reportAction.moderatorMember.is_email_verified,
          created_at: toISOStringSafe(reportAction.moderatorMember.created_at),
          updated_at: toISOStringSafe(reportAction.moderatorMember.updated_at),
          deleted_at: reportAction.moderatorMember.deleted_at
            ? toISOStringSafe(reportAction.moderatorMember.deleted_at)
            : null,
        }
      : undefined,
    adminMember: reportAction.adminMember
      ? {
          id: reportAction.adminMember.id,
          email: reportAction.adminMember.email,
          admin_level: reportAction.adminMember.admin_level,
          created_at: toISOStringSafe(reportAction.adminMember.created_at),
          updated_at: toISOStringSafe(reportAction.adminMember.updated_at),
          deleted_at: reportAction.adminMember.deleted_at
            ? toISOStringSafe(reportAction.adminMember.deleted_at)
            : null,
        }
      : null,
  };
}
