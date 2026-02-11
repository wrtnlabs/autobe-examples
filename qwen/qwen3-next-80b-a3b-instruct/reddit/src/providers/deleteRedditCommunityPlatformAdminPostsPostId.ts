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
import { PlatformadminPayload } from "../decorators/payload/PlatformadminPayload";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function deleteRedditCommunityPlatformAdminPostsPostId(props: {
  platformAdmin: PlatformadminPayload;
  postId: string & tags.Format<"uuid">;
}): Promise<IRedditCommunityPost> {
  const userCommunity =
    await MyGlobal.prisma.reddit_community_user_communities.findUnique({
      where: { id: props.postId },
    });
  if (!userCommunity) {
    throw new HttpException("Post not found", 404);
  }
  await MyGlobal.prisma.reddit_community_user_communities.delete({
    where: { id: props.postId },
  });
  // The userCommunity object has fields: reddit_community_member_id and reddit_community_community_id
  // Get the community information using the correct field name
  const community =
    await MyGlobal.prisma.reddit_community_communities.findUnique({
      where: { id: userCommunity.reddit_community_community_id },
    });
  // Get the author (member) information using the correct field name
  const author = await MyGlobal.prisma.reddit_community_members.findUnique({
    where: { id: userCommunity.reddit_community_member_id },
  });
  const userProfile = author
    ? {
        id: author.id,
        display_name: author.display_name || "",
        avatar_url: author.avatar_url,
      }
    : {
        id: props.postId,
        display_name: "Deleted User",
        avatar_url: null,
      };
  const communitySummary = community
    ? {
        id: community.id,
        name: community.name,
        description: community.description,
        icon_url: community.icon_url,
        subscriber_count: community.subscriber_count,
        created_at: toISOStringSafe(community.created_at),
      }
    : {
        id: props.postId,
        name: "Unknown Community",
        description: null,
        icon_url: null,
        subscriber_count: 0,
        created_at: "2026-02-10T07:54:24.321Z",
      };
  const contentText =
    "[Post content not stored in system]" as IRedditCommunityPost.IContentText;
  return {
    id: userCommunity.id,
    title: "Deletion-Only Post (No title stored)",
    content: contentText,
    author: userProfile,
    community: communitySummary,
    vote_score: 0,
    comments_count: 0,
    created_at: toISOStringSafe(userCommunity.created_at),
    updated_at: toISOStringSafe(userCommunity.created_at),
    deleted_at: toISOStringSafe(new Date()),
    status: "deleted",
    karma_score: 0,
  };
}
