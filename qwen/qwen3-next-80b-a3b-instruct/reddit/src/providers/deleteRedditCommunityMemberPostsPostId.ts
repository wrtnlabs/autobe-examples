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
import { MemberPayload } from "../decorators/payload/MemberPayload";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function deleteRedditCommunityMemberPostsPostId(props: {
  member: MemberPayload;
  postId: string & tags.Format<"uuid">;
}): Promise<IRedditCommunityPost> {
  // Find the post record
  const post = await MyGlobal.prisma.reddit_community_posts.findUnique({
    where: { id: props.postId },
    select: {
      id: true,
      title: true,
      textContent: true,
      url: true,
      imageUrl: true,
      author_id: true,
      community_id: true,
      vote_score: true,
      comment_count: true,
      created_at: true,
      updated_at: true,
      deleted_at: true,
    },
  });
  if (!post) throw new HttpException("Post not found", 404);
  // Check if post is already deleted
  if (post.deleted_at) throw new HttpException("Post not found", 404);
  // Get the author's user profile to obtain karma score
  const userProfile =
    await MyGlobal.prisma.reddit_community_user_profiles.findUnique({
      where: { id: post.author_id },
      select: {
        display_name: true,
        avatar_url: true,
        karma: true,
      },
    });
  if (!userProfile) throw new HttpException("Post author not found", 404);
  // Get the community
  const community =
    await MyGlobal.prisma.reddit_community_communities.findUnique({
      where: { id: post.community_id },
      select: {
        id: true,
        name: true,
        description: true,
        icon_url: true,
        subscriber_count: true,
        created_at: true,
      },
    });
  if (!community) throw new HttpException("Community not found", 404);
  // Verify authorization: member must be author or community moderator
  const isAuthor = post.author_id === props.member.id;
  const isModerator =
    !!(await MyGlobal.prisma.reddit_community_community_moderators.findFirst({
      where: {
        community_id: community.id,
        member_id: props.member.id,
      },
    }));
  if (!isAuthor && !isModerator) throw new HttpException("Forbidden", 403);
  // Perform hard delete
  await MyGlobal.prisma.reddit_community_posts.delete({
    where: { id: props.postId },
  });
  // Construct response
  const content = post.textContent
    ? post.textContent
    : post.url
      ? post.url
      : post.imageUrl
        ? {
            url: post.imageUrl,
            extension: post.imageUrl?.endsWith(".jpg")
              ? "jpg"
              : post.imageUrl?.endsWith(".jpeg")
                ? "jpeg"
                : post.imageUrl?.endsWith(".png")
                  ? "png"
                  : post.imageUrl?.endsWith(".gif")
                    ? "gif"
                    : post.imageUrl?.endsWith(".webp")
                      ? "webp"
                      : "jpg",
            size_kb: 0,
          }
        : "";
  return {
    id: post.id,
    title: post.title,
    content: content as
      | IRedditCommunityPost.IContentText
      | IRedditCommunityPost.IContentUrl
      | IRedditCommunityPost.IContentImageUrl,
    author: {
      id: post.author_id,
      display_name: userProfile.display_name,
      avatar_url: userProfile.avatar_url ?? null,
    },
    community: {
      id: community.id,
      name: community.name,
      description: community.description,
      icon_url: community.icon_url ?? null,
      subscriber_count: community.subscriber_count,
      created_at: toISOStringSafe(community.created_at) as string &
        tags.Format<"date-time">,
    },
    vote_score: post.vote_score,
    comments_count: post.comment_count,
    created_at: toISOStringSafe(post.created_at) as string &
      tags.Format<"date-time">,
    updated_at: toISOStringSafe(post.updated_at) as string &
      tags.Format<"date-time">,
    deleted_at: post.deleted_at
      ? (toISOStringSafe(post.deleted_at) as string & tags.Format<"date-time">)
      : null,
    status: post.deleted_at ? "deleted" : "active",
    karma_score: userProfile.karma,
  };
}
