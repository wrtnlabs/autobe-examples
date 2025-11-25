import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { ICommunityForumCommunityModerationAction } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityForumCommunityModerationAction";
import { ModeratorPayload } from "../decorators/payload/ModeratorPayload";

export async function postCommunityForumModeratorModerationActions(props: {
  moderator: ModeratorPayload;
  body: ICommunityForumCommunityModerationAction.ICreate;
}): Promise<ICommunityForumCommunityModerationAction> {
  // Validate that the community exists
  const community =
    await MyGlobal.prisma.community_forum_communities.findUnique({
      where: {
        id: props.body.community_forum_community_id,
      },
    });

  if (!community) {
    throw new HttpException("Community not found", 404);
  }

  // Validate that the moderator exists
  const moderator = await MyGlobal.prisma.community_forum_moderators.findUnique(
    {
      where: {
        community_forum_user_id: props.moderator.id,
      },
    },
  );

  if (!moderator) {
    throw new HttpException("Moderator not found", 404);
  }

  // If report ID is provided, validate that it exists
  if (props.body.community_forum_report_id) {
    const report = await MyGlobal.prisma.community_forum_reports.findUnique({
      where: {
        id: props.body.community_forum_report_id,
      },
    });

    if (!report) {
      throw new HttpException("Report not found", 404);
    }
  }

  // Get the current timestamp
  const now = toISOStringSafe(new Date());

  // Create the moderation action record
  const created =
    await MyGlobal.prisma.community_forum_moderation_actions.create({
      data: {
        id: v4() as string & tags.Format<"uuid">,
        community_forum_moderator_id: moderator.id,
        community_forum_report_id: props.body.community_forum_report_id ?? null,
        community_forum_community_id: props.body.community_forum_community_id,
        action_type: props.body.action_type,
        reason: props.body.reason,
        details: props.body.details,
        created_at: now,
        updated_at: now,
      },
    });

  // Return the created record with proper DTO mapping
  return {
    id: created.id,
    community_forum_moderator_id: created.community_forum_moderator_id,
    community_forum_report_id: created.community_forum_report_id ?? undefined,
    community_forum_community_id: created.community_forum_community_id,
    action_type: created.action_type,
    reason: created.reason,
    details: created.details ?? undefined,
    created_at: toISOStringSafe(created.created_at),
    updated_at: toISOStringSafe(created.updated_at),
  };
}
