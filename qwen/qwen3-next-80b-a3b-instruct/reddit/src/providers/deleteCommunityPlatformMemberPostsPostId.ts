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
import { MemberPayload } from "../decorators/payload/MemberPayload";

export async function deleteCommunityPlatformMemberPostsPostId(props: {
  member: MemberPayload;
  postId: string;
}): Promise<void> {
  const post = await MyGlobal.prisma.community_platform_posts.findUnique({
    where: {
      id: props.postId,
      author_id: props.member.id,
    },
  });
  if (!post) {
    throw new HttpException("Post not found", 404);
  }
  // Cascade delete all related content - use scalar field names directly
  await MyGlobal.prisma.community_platform_comment_reports.deleteMany({
    where: {
      post_id: props.postId,
    },
  });
  await MyGlobal.prisma.community_platform_comment_votes.deleteMany({
    where: {
      post_id: props.postId,
    },
  });
  await MyGlobal.prisma.community_platform_post_votes.deleteMany({
    where: {
      post_id: props.postId,
    },
  });
  // Delete the post itself
  await MyGlobal.prisma.community_platform_posts.delete({
    where: {
      id: props.postId,
    },
  });
  // Update karma for author - subtract the net upvote score of the deleted post
  // The karma should be decreased by the net upvotes (total upvotes - total downvotes)
  // In the schema, vote_score represents this net value
  await MyGlobal.prisma.community_platform_members.update({
    where: {
      id: post.author_id,
    },
    data: {
      karma: { decrement: post.vote_score }, // Use decrement operation that Prisma supports
    },
  });
  // Log deletion event - use actor_id directly instead of actor connect object
  await MyGlobal.prisma.community_platform_moderation_logs.create({
    data: {
      id: v4(),
      action_type: "POST_DELETED",
      actor_id: props.member.id,
      target_type: "POST",
      target_id: props.postId,
      created_at: toISOStringSafe(new Date()),
    },
  });
}
