import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ICommunityPlatformPost } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPost";
import { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";
import { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import { MemberPayload } from "../decorators/payload/MemberPayload";

export async function putCommunityPlatformMemberCommunitiesCommunityNamePostsPostId(props: {
  member: MemberPayload;
  communityName: string;
  postId: string;
  body: ICommunityPlatformPost.IUpdate;
}): Promise<ICommunityPlatformPost> {
  // Retrieve the community by name
  const community =
    await MyGlobal.prisma.community_platform_communities.findFirst({
      where: { name: props.communityName, deleted_at: null },
      select: { id: true, description: true, icon: true, created_at: true },
    });
  if (!community) {
    throw new HttpException("Community not found", 404);
  }
  // Retrieve the post by ID and verify it belongs to the community
  const post = await MyGlobal.prisma.community_platform_posts.findUnique({
    where: {
      id: props.postId,
      community: { id: community.id },
    },
    select: {
      id: true,
      title: true,
      created_at: true,
      updated_at: true,
      author_id: true,
      community_id: true,
    },
  });
  if (!post) {
    throw new HttpException(
      "Post not found or does not belong to this community",
      404,
    );
  }
  // Verify user is author or moderator
  const isAuthor = post.author_id === props.member.id;
  const isModerator =
    (await MyGlobal.prisma.community_platform_moderators.findFirst({
      where: {
        community: { id: community.id },
        member: { id: props.member.id },
        deleted_at: null,
      },
    })) !== null;
  if (!isAuthor && !isModerator) {
    throw new HttpException(
      "Forbidden - You must be the author or a moderator to update this post",
      403,
    );
  }
  // Calculate 24 hours ago as a date-time string (avoiding Date object)
  // Since we're working with string & Format<'date-time'>, we create this string
  const twentyFourHoursAgo = toISOStringSafe(
    new Date(Date.now() - 24 * 60 * 60 * 1000),
  );
  // Verify 24-hour edit window
  if (toISOStringSafe(post.created_at) > twentyFourHoursAgo && !isModerator) {
    throw new HttpException(
      "Cannot update post older than 24 hours unless you are a moderator",
      403,
    );
  }
  // Construct update object
  const updateData: any = {
    updated_at: toISOStringSafe(new Date()),
    edited_at: toISOStringSafe(new Date()),
  };
  // Since ICommunityPlatformPost.IUpdate is empty, we cannot access title, content_type, text, url, image_url from props.body
  // The only updateable fields are those explicitly allowed by IUpdate (none in this case), so we skip content modifications
  // Update the post record
  const updatedPost = await MyGlobal.prisma.community_platform_posts.update({
    where: { id: props.postId },
    data: updateData,
  });
  // Get author information
  const author = await MyGlobal.prisma.community_platform_members.findUnique({
    where: { id: updatedPost.author_id },
    select: { id: true, username: true, avatar: true, karma: true },
  });
  // Get community information
  const communityInfo =
    await MyGlobal.prisma.community_platform_communities.findUnique({
      where: { id: updatedPost.community_id },
      select: {
        id: true,
        name: true,
        description: true,
        icon: true,
        created_at: true,
      },
    });
  // Calculate score from post_votes
  const votes = await MyGlobal.prisma.community_platform_post_votes.aggregate({
    where: { post: { id: updatedPost.id } },
    _sum: { vote_type: true },
  });
  const score = votes._sum?.vote_type || 0;
  // Calculate comment count
  const commentCount = await MyGlobal.prisma.community_platform_comments.count({
    where: { post: { id: updatedPost.id }, deleted_at: null },
  });
  // Construct and return ICommunityPlatformPost
  return {
    author: {
      id: author?.id ?? "",
      username: author?.username ?? "",
      avatar: author?.avatar ?? "",
      karma: author?.karma ?? 0,
    },
    community: {
      name: communityInfo?.name ?? "",
      description: communityInfo?.description ?? "",
      icon: communityInfo?.icon ?? "",
      subscriber_count: 0, // This would require querying community_platform_community_subscriptions
      created_at: toISOStringSafe(communityInfo?.created_at ?? new Date()),
    },
    id: updatedPost.id,
    title: updatedPost.title,
    content_type: "text" satisfies "link" | "text" | "image" as
      | "link"
      | "text"
      | "image",
    score: score,
    comment_count: commentCount,
    created_at: toISOStringSafe(updatedPost.created_at),
  };
}
