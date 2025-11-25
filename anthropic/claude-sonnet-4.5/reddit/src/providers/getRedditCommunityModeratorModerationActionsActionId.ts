import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IRedditCommunityModerationAction } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityModerationAction";
import { IRedditCommunityCommunityModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityCommunityModerator";
import { IRedditCommunityCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityCommunity";
import { ModeratorPayload } from "../decorators/payload/ModeratorPayload";

export async function getRedditCommunityModeratorModerationActionsActionId(props: {
  moderator: ModeratorPayload;
  actionId: string & tags.Format<"uuid">;
}): Promise<IRedditCommunityModerationAction> {
  const action =
    await MyGlobal.prisma.reddit_community_moderation_actions.findUnique({
      where: { id: props.actionId },
      include: {
        moderator: true,
        community: true,
      },
    });

  if (!action) {
    throw new HttpException("Moderation action not found", 404);
  }

  return {
    id: action.id,
    reddit_community_moderator_id: action.reddit_community_moderator_id,
    reddit_community_community_id: action.reddit_community_community_id,
    reddit_community_report_id:
      action.reddit_community_report_id === null
        ? undefined
        : action.reddit_community_report_id,
    action_type: action.action_type,
    target_content_type:
      action.target_content_type === null
        ? undefined
        : action.target_content_type,
    target_content_id:
      action.target_content_id === null ? undefined : action.target_content_id,
    target_member_id:
      action.target_member_id === null ? undefined : action.target_member_id,
    reason: action.reason,
    created_at: toISOStringSafe(action.created_at),
    moderator: {
      id: action.moderator.id,
      username: action.moderator.username,
      display_name:
        action.moderator.display_name === null
          ? undefined
          : action.moderator.display_name,
      avatar_url:
        action.moderator.avatar_url === null
          ? undefined
          : action.moderator.avatar_url,
      post_karma: action.moderator.post_karma,
      comment_karma: action.moderator.comment_karma,
      created_at: toISOStringSafe(action.moderator.created_at),
    },
    community: {
      id: action.community.id,
      name: action.community.name,
      display_title: action.community.display_title,
      created_at: toISOStringSafe(action.community.created_at),
    },
  };
}
