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

export async function putRedditCommunityCommunityModeratorReportsReportIdReportActionsActionId(props: {
  communityModerator: CommunitymoderatorPayload;
  reportId: string & tags.Format<"uuid">;
  actionId: string & tags.Format<"uuid">;
  body: IRedditCommunityReportAction.IUpdate;
}): Promise<IRedditCommunityReportAction> {
  const { communityModerator, reportId, actionId, body } = props;

  const existingAction =
    await MyGlobal.prisma.reddit_community_report_actions.findUnique({
      where: { id: actionId },
    });

  if (!existingAction) {
    throw new HttpException("Report action not found", 404);
  }

  if (existingAction.moderator_member_id !== communityModerator.id) {
    throw new HttpException("Forbidden: Not the owner moderator", 403);
  }

  const now = toISOStringSafe(new Date());

  const updated = await MyGlobal.prisma.reddit_community_report_actions.update({
    where: { id: actionId },
    data: {
      report_id: body.report_id,
      moderator_member_id: body.moderator_member_id,
      admin_member_id: body.admin_member_id ?? null,
      action_type: body.action_type,
      notes: body.notes ?? null,
      created_at: body.created_at,
      updated_at: now,
      deleted_at: body.deleted_at ? toISOStringSafe(body.deleted_at) : null,
    },
  });

  return {
    id: updated.id,
    report_id: updated.report_id,
    moderator_member_id: updated.moderator_member_id,
    admin_member_id: updated.admin_member_id ?? null,
    action_type: updated.action_type,
    notes: updated.notes ?? null,
    created_at: toISOStringSafe(updated.created_at),
    updated_at: toISOStringSafe(updated.updated_at),
    deleted_at: updated.deleted_at ? toISOStringSafe(updated.deleted_at) : null,
  };
}
