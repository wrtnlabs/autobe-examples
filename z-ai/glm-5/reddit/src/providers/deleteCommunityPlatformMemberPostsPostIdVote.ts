import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
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

export async function deleteCommunityPlatformMemberPostsPostIdVote(props: {
  member: {
    id: string & tags.Format<"uuid">;
    session_id: string & tags.Format<"uuid">;
    type: "member";
  };
  postId: string & tags.Format<"uuid">;
}): Promise<void> {
  // Verify post exists and is not soft-deleted
  const post = await MyGlobal.prisma.community_platform_posts.findUniqueOrThrow(
    {
      where: { id: props.postId },
      select: { id: true, author_id: true, deleted_at: true },
    },
  );
  if (post.deleted_at !== null) {
    throw new HttpException("Post not found", 404);
  }
  // Find the member's vote on this post
  const vote = await MyGlobal.prisma.community_platform_votes.findFirst({
    where: {
      post_id: props.postId,
      member_id: props.member.id,
    },
    select: { id: true, vote_type: true },
  });
  if (vote === null) {
    throw new HttpException("No vote found", 404);
  }
  // Execute atomic transaction for vote removal and score/karma updates
  // Upvote removal: score -1, karma -1 (removing the +1 contribution)
  // Downvote removal: score +1, karma +1 (removing the -1 contribution)
  if (vote.vote_type === "upvote") {
    await MyGlobal.prisma.$transaction([
      MyGlobal.prisma.community_platform_votes.delete({
        where: { id: vote.id },
      }),
      MyGlobal.prisma.community_platform_posts.update({
        where: { id: props.postId },
        data: {
          score: { decrement: 1 },
          updated_at: new Date(),
        },
      }),
      MyGlobal.prisma.community_platform_members.update({
        where: { id: post.author_id },
        data: {
          karma: { decrement: 1 },
          updated_at: new Date(),
        },
      }),
    ]);
  } else {
    await MyGlobal.prisma.$transaction([
      MyGlobal.prisma.community_platform_votes.delete({
        where: { id: vote.id },
      }),
      MyGlobal.prisma.community_platform_posts.update({
        where: { id: props.postId },
        data: {
          score: { increment: 1 },
          updated_at: new Date(),
        },
      }),
      MyGlobal.prisma.community_platform_members.update({
        where: { id: post.author_id },
        data: {
          karma: { increment: 1 },
          updated_at: new Date(),
        },
      }),
    ]);
  }
}
