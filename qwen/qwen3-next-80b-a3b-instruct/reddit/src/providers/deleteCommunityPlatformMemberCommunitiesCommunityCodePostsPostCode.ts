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

// DON'T CHANGE FUNCTION NAME AND PARAMETERS,
// ONLY YOU HAVE TO WRITE THIS FUNCTION BODY, AND USE IMPORTED.
export async function deleteCommunityPlatformMemberCommunitiesCommunityCodePostsPostCode(props: {
  member: MemberPayload;
  communityCode: string;
  postCode: string;
}): Promise<ICommunityPlatformPost> {
  // Find the post by postCode - Prisma doesn't have 'code', use 'id' instead
  const posts = await MyGlobal.prisma.community_platform_posts.findMany({
    where: {
      id: props.postCode,
    },
    take: 1,
  });
  const post = posts[0];
  if (!post) {
    throw new HttpException("Post not found", 404);
  }
  // Find the community by communityCode
  const communities =
    await MyGlobal.prisma.community_platform_communities.findMany({
      where: {
        id: props.communityCode,
      },
      take: 1,
    });
  const community = communities[0];
  if (!community) {
    throw new HttpException("Community not found", 404);
  }
  // Verify the community_id matches the community we found
  if (post.community_id !== community.id) {
    throw new HttpException("Post not found in specified community", 404);
  }
  // Verify the member is either the post owner or community owner
  const isPostOwner = post.author_id === props.member.id;
  const isCommunityOwner =
    await MyGlobal.prisma.community_platform_owners.findUnique({
      where: {
        community_id: post.community_id,
        id: props.member.id,
      },
    });
  if (!isPostOwner && !isCommunityOwner) {
    throw new HttpException(
      "Forbidden: Not authorized to delete this post",
      403,
    );
  }
  // Log the deletion in moderation_log
  await MyGlobal.prisma.community_platform_moderation_logs.create({
    data: {
      id: v4(),
      actor_id: props.member.id, // Fixed: actor_id not actorId
      action: "post_delete",
      target_type: "post",
      target_id: post.id,
      reason: "Post deleted by authorized member",
      created_at: toISOStringSafe(new Date()),
    },
  });
  // Perform hard delete of the post
  const deletedPost = await MyGlobal.prisma.community_platform_posts.delete({
    where: { id: post.id },
  });
  // Compute content_type based on subsidiary tables that exist
  // content_type is computed (text, link, or image) based on which subsidiary table has data
  let content_type: "text" | "link" | "image" = "text"; // default
  // Check if post has a text content
  const hasText =
    await MyGlobal.prisma.community_platform_post_texts.findUnique({
      where: { post_id: post.id },
    });
  // Check if post has a url content
  const hasUrl = await MyGlobal.prisma.community_platform_post_urls.findUnique({
    where: { post_id: post.id },
  });
  // Check if post has an image content
  const hasImage =
    await MyGlobal.prisma.community_platform_post_images.findUnique({
      where: { post_id: post.id },
    });
  if (hasText) content_type = "text";
  else if (hasUrl) content_type = "link";
  else if (hasImage) content_type = "image";
  // Return the deleted post object as per ICommunityPlatformPost response type
  return {
    id: deletedPost.id,
    title: deletedPost.title,
    content_type: content_type, // Computed correctly based on subsidiary tables
    score: deletedPost.vote_score,
    comment_count: deletedPost.comment_count,
    created_at: toISOStringSafe(deletedPost.created_at),
    author: {
      id: deletedPost.author_id,
    },
    community: {
      name: community.name || "",
      description: community.description || "",
      icon: community.icon || "",
      subscriber_count: community.subscriber_count || 0,
      created_at: community.created_at
        ? toISOStringSafe(community.created_at)
        : toISOStringSafe(new Date()),
    },
  };
}
