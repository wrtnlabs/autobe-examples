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

export async function deleteCommunityPlatformMemberPostsPostId(props: {
  member: MemberPayload;
  postId: string & tags.Format<"uuid">;
}): Promise<void> {
  // Find the post
  const post = await MyGlobal.prisma.community_platform_posts.findUnique({
    where: { id: props.postId },
    select: {
      id: true,
      author_id: true,
      deleted_at: true,
    },
  });
  // Return 404 if post not found or already deleted
  if (post === null || post.deleted_at !== null) {
    throw new HttpException("Post not found", 404);
  }
  // Verify the authenticated member is the post author
  if (post.author_id !== props.member.id) {
    throw new HttpException("Forbidden", 403);
  }
  // Query all votes on this post to calculate karma adjustment
  const votes = await MyGlobal.prisma.community_platform_votes.findMany({
    where: {
      post_id: props.postId,
    },
    select: {
      vote_type: true,
    },
  });
  // Calculate karma adjustment:
  // - Each upvote: decrement by 1 (removing karma gained)
  // - Each downvote: increment by 1 (reversing karma penalty)
  let karmaDelta = 0;
  for (const vote of votes) {
    if (vote.vote_type === "upvote") {
      karmaDelta -= 1;
    } else if (vote.vote_type === "downvote") {
      karmaDelta += 1;
    }
  }
  // Find pending reports targeting this post
  const pendingReports =
    await MyGlobal.prisma.community_platform_report_posts.findMany({
      where: {
        community_platform_post_id: props.postId,
        report: {
          status: "pending",
        },
      },
      select: {
        community_platform_report_id: true,
      },
    });
  const now = new Date();
  // Execute all updates in a transaction
  await MyGlobal.prisma.$transaction(async (tx) => {
    // Soft delete the post
    await tx.community_platform_posts.update({
      where: { id: props.postId },
      data: {
        deleted_at: now,
      },
    });
    // Soft delete all comments on this post
    await tx.community_platform_comments.updateMany({
      where: {
        post_id: props.postId,
        deleted_at: null,
      },
      data: {
        deleted_at: now,
      },
    });
    // Delete all votes on this post (votes table doesn't have soft delete)
    await tx.community_platform_votes.deleteMany({
      where: {
        post_id: props.postId,
      },
    });
    // Update author's karma if there's a change
    if (karmaDelta !== 0) {
      await tx.community_platform_members.update({
        where: { id: post.author_id },
        data: {
          karma: {
            increment: karmaDelta,
          },
        },
      });
    }
    // Mark pending reports as approved (content removed)
    if (pendingReports.length > 0) {
      await tx.community_platform_reports.updateMany({
        where: {
          id: {
            in: pendingReports.map((r) => r.community_platform_report_id),
          },
          status: "pending",
        },
        data: {
          status: "approved",
          updated_at: now,
        },
      });
    }
  });
}
