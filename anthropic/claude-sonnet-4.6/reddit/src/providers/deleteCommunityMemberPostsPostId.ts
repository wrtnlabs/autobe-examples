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

export async function deleteCommunityMemberPostsPostId(props: {
  member: MemberPayload;
  postId: string & tags.Format<"uuid">;
}): Promise<void> {
  // Step 1: Fetch post — 404 if not found or already soft-deleted
  const post = await MyGlobal.prisma.community_posts.findFirst({
    where: {
      id: props.postId,
      deleted_at: null,
    },
    select: {
      id: true,
      community_member_id: true,
      community_community_id: true,
    },
  });
  if (post === null) {
    throw new HttpException("Post not found", 404);
  }
  // Step 2: Authorization — must be the author or a community moderator/owner
  const isAuthor = post.community_member_id === props.member.id;
  if (!isAuthor) {
    const moderator = await MyGlobal.prisma.community_moderators.findFirst({
      where: {
        community_id: post.community_community_id,
        member_id: props.member.id,
      },
      select: { id: true },
    });
    if (moderator === null) {
      throw new HttpException("Forbidden", 403);
    }
  }
  // Step 3: Execute all deletion steps atomically within a single transaction
  await MyGlobal.prisma.$transaction(async (tx) => {
    const now = new Date();
    // Step 3a: Soft-delete the post
    await tx.community_posts.update({
      where: { id: props.postId },
      data: { deleted_at: now },
    });
    // Step 3b: Cascade soft-delete ALL comments on this post (all depths)
    await tx.community_comments.updateMany({
      where: {
        post_id: props.postId,
        deleted_at: null,
      },
      data: { deleted_at: now },
    });
    // Step 3c: Fetch all votes on this post to compute karma reversal
    const votes = await tx.community_post_votes.findMany({
      where: { community_post_id: props.postId },
      select: { vote_type: true },
    });
    if (votes.length > 0) {
      // Upvote previously gave author +1 karma → reversal delta: -1
      // Downvote previously gave author -1 karma → reversal delta: +1
      const upvoteCount = votes.filter((v) => v.vote_type === "upvote").length;
      const downvoteCount = votes.filter(
        (v) => v.vote_type === "downvote",
      ).length;
      const netDelta = downvoteCount - upvoteCount;
      // Step 3d: Hard-delete all votes for this post
      // (existing karma logs referencing these votes will cascade-delete)
      await tx.community_post_votes.deleteMany({
        where: { community_post_id: props.postId },
      });
      // Step 3e: Insert compensating karma log and update karma score if needed
      if (netDelta !== 0) {
        // findUnique leverages the @@unique([community_member_id]) constraint
        const authorProfile = await tx.community_user_profiles.findUnique({
          where: { community_member_id: post.community_member_id },
          select: { id: true, karma_score: true },
        });
        if (authorProfile !== null) {
          // Insert a single aggregated compensating karma log entry
          await tx.community_user_profile_karma_logs.create({
            data: {
              id: v4(),
              community_user_profile_id: authorProfile.id,
              community_post_vote_id: null,
              community_comment_vote_id: null,
              source_type: "post_vote_removed",
              delta: netDelta,
              created_at: now,
            },
          });
          // Update the denormalized karma score
          await tx.community_user_profiles.update({
            where: { id: authorProfile.id },
            data: {
              karma_score: authorProfile.karma_score + netDelta,
              updated_at: now,
            },
          });
        }
      }
    }
  });
}
