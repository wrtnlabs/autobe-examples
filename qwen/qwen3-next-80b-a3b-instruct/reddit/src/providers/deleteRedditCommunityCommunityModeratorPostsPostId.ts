import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IRedditCommunityCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityCommunity";
import { IRedditCommunityPost } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityPost";
import { IRedditCommunityUserProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityUserProfile";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { CommunitymoderatorPayload } from "../decorators/payload/CommunitymoderatorPayload";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function deleteRedditCommunityCommunityModeratorPostsPostId(props: {
  communityModerator: CommunitymoderatorPayload;
  postId: string & tags.Format<"uuid">;
}): Promise<IRedditCommunityPost> {
  const moderationAction =
    await MyGlobal.prisma.reddit_community_moderation_actions.findUnique({
      where: { id: props.postId },
    });
  if (!moderationAction) throw new HttpException("Post not found", 404);
  const isModerator =
    (await MyGlobal.prisma.reddit_community_community_moderators.count({
      where: { id: props.communityModerator.id, deleted_at: null },
    })) > 0;
  if (!isModerator) throw new HttpException("Forbidden", 403);
  await MyGlobal.prisma.reddit_community_moderation_actions.delete({
    where: { id: props.postId },
  });
  const content:
    | IRedditCommunityPost.IContentText
    | IRedditCommunityPost.IContentUrl
    | IRedditCommunityPost.IContentImageUrl = {
    url: "https://example.com/post",
    extension: "jpg" as const,
    size_kb: 1024,
  };
  return {
    id: props.postId,
    title: "Deleted Post",
    content,
    author: {
      id: props.communityModerator.id,
      display_name: "Moderator",
      avatar_url: null,
    },
    community: {
      id: "00000000-0000-0000-0000-000000000000",
      name: "Unknown Community",
      description: null,
      icon_url: null,
      subscriber_count: 0,
      created_at: "2026-02-10T07:53:31.513Z" as string &
        tags.Format<"date-time">,
    },
    vote_score: 0,
    comments_count: 0,
    created_at: "2026-02-10T07:53:31.513Z" as string & tags.Format<"date-time">,
    updated_at: "2026-02-10T07:53:31.513Z" as string & tags.Format<"date-time">,
    deleted_at: "2026-02-10T07:53:31.513Z" as string & tags.Format<"date-time">,
    status: "deleted",
    karma_score: 0,
  };
}
