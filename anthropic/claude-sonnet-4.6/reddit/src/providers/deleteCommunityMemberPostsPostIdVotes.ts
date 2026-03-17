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

export async function deleteCommunityMemberPostsPostIdVotes(props: {
  member: MemberPayload;
  postId: string & tags.Format<"uuid">;
}): Promise<void> {
  // Step 1: Verify the post exists and is not deleted
  const post = await MyGlobal.prisma.community_posts.findFirst({
    where: {
      id: props.postId,
      deleted_at: null,
    },
    select: {
      id: true,
      community_member_id: true,
    },
  });
  if (post === null) {
    throw new HttpException("Post not found or has been deleted", 404);
  }
  // Step 2: Find the member's vote on this post
  const vote = await MyGlobal.prisma.community_post_votes.findFirst({
    where: {
      community_member_id: props.member.id,
      community_post_id: props.postId,
    },
    select: {
      id: true,
      vote_type: true,
    },
  });
  if (vote === null) {
    throw new HttpException("No vote found to retract", 404);
  }
  // Step 3: Find the post author's user profile
  const authorProfile = await MyGlobal.prisma.community_user_profiles.findFirst(
    {
      where: {
        community_member_id: post.community_member_id,
      },
      select: {
        id: true,
      },
    },
  );
  if (authorProfile === null) {
    throw new HttpException("Author profile not found", 404);
  }
  // Step 4: Determine karma delta reversal
  // upvote originally gave +1 karma → reversal is -1
  // downvote originally gave -1 karma → reversal is +1
  const karmaDelta = vote.vote_type === "upvote" ? -1 : 1;
  // Step 5: Execute within a transaction
  await MyGlobal.prisma.$transaction(async (tx) => {
    // 5a. Insert reversal karma log (community_post_vote_id = null to avoid cascade)
    await tx.community_user_profile_karma_logs.create({
      data: {
        id: v4(),
        community_user_profile_id: authorProfile.id,
        community_post_vote_id: null,
        community_comment_vote_id: null,
        source_type: "post_vote_removed",
        delta: karmaDelta,
        created_at: new Date(),
      },
    });
    // 5b. Update author's karma_score
    await tx.community_user_profiles.update({
      where: { id: authorProfile.id },
      data: {
        karma_score: { increment: karmaDelta },
        updated_at: new Date(),
      },
    });
    // 5c. Delete the vote (cascade will remove karma logs linked to this vote_id)
    await tx.community_post_votes.delete({
      where: { id: vote.id },
    });
  });
}
