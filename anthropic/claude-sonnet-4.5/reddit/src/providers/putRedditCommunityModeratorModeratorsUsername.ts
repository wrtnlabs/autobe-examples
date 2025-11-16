import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IRedditCommunityCommunityModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityCommunityModerator";
import { ModeratorPayload } from "../decorators/payload/ModeratorPayload";

export async function putRedditCommunityModeratorModeratorsUsername(props: {
  moderator: ModeratorPayload;
  username: string;
  body: IRedditCommunityCommunityModerator.IUpdate;
}): Promise<IRedditCommunityCommunityModerator.ISummary> {
  const existing = await MyGlobal.prisma.reddit_community_moderators.findFirst({
    where: {
      username: props.username,
      deleted_at: null,
    },
  });

  if (!existing) {
    throw new HttpException("Moderator not found", 404);
  }

  if (existing.id !== props.moderator.id) {
    throw new HttpException(
      "Forbidden: You can only update your own account",
      403,
    );
  }

  const now = toISOStringSafe(new Date());

  const updated = await MyGlobal.prisma.reddit_community_moderators.update({
    where: {
      id: existing.id,
    },
    data: {
      ...(props.body.email !== undefined && { email: props.body.email }),
      ...(props.body.display_name !== undefined && {
        display_name: props.body.display_name,
      }),
      ...(props.body.bio !== undefined && { bio: props.body.bio }),
      ...(props.body.avatar_url !== undefined && {
        avatar_url: props.body.avatar_url,
      }),
      ...(props.body.show_online_status !== undefined && {
        show_online_status: props.body.show_online_status,
      }),
      ...(props.body.show_subscribed_communities !== undefined && {
        show_subscribed_communities: props.body.show_subscribed_communities,
      }),
      ...(props.body.show_activity_feed !== undefined && {
        show_activity_feed: props.body.show_activity_feed,
      }),
      updated_at: now,
    },
  });

  return {
    id: updated.id as string & tags.Format<"uuid">,
    username: updated.username,
    display_name: updated.display_name ?? undefined,
    avatar_url: updated.avatar_url
      ? (updated.avatar_url as string & tags.Format<"uri">)
      : (updated.avatar_url ?? undefined),
    post_karma: updated.post_karma,
    comment_karma: updated.comment_karma,
    created_at: toISOStringSafe(updated.created_at),
  };
}
