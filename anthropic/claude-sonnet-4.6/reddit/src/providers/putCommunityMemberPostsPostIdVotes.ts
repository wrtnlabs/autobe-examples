import { ICommunityCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityCommunity";
import { ICommunityMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityMember";
import { ICommunityPost } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPost";
import { ICommunityPostVote } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPostVote";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { MemberPayload } from "../decorators/payload/MemberPayload";
import { CommunityPostVoteTransformer } from "../transformers/CommunityPostVoteTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function putCommunityMemberPostsPostIdVotes(props: {
  member: MemberPayload;
  postId: string & tags.Format<"uuid">;
  body: ICommunityPostVote.IUpdate;
}): Promise<ICommunityPostVote> {
  // 1. Validate that the post exists and is active (not deleted)
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
  // 2. Validate that the caller is NOT the post author
  if (post.community_member_id === props.member.id) {
    throw new HttpException("You cannot vote on your own post", 403);
  }
  // 3. Check for an existing vote by this member on this post
  const existingVote = await MyGlobal.prisma.community_post_votes.findUnique({
    where: {
      community_member_id_community_post_id: {
        community_member_id: props.member.id,
        community_post_id: props.postId,
      },
    },
    select: {
      id: true,
      vote_type: true,
    },
  });
  // 4. Reject if same vote_type is submitted (invalid state transition)
  if (
    existingVote !== null &&
    existingVote.vote_type === props.body.vote_type
  ) {
    throw new HttpException(
      "You have already cast this vote direction on this post",
      422,
    );
  }
  // 5. Determine vote record id, karma delta, and source_type
  const isNewVote = existingVote === null;
  const newVoteId = isNewVote
    ? (v4() as string & tags.Format<"uuid">)
    : (existingVote.id as string & tags.Format<"uuid">);
  const karmaDelta = isNewVote
    ? props.body.vote_type === "upvote"
      ? 1
      : -1
    : props.body.vote_type === "upvote"
      ? 2
      : -2;
  const sourceType = isNewVote
    ? props.body.vote_type === "upvote"
      ? "post_upvote_received"
      : "post_downvote_received"
    : "post_vote_changed";
  // 6. Execute all writes atomically in a transaction
  await MyGlobal.prisma.$transaction(async (tx) => {
    if (isNewVote) {
      // INSERT new vote record
      await tx.community_post_votes.create({
        data: {
          id: newVoteId,
          community_member_id: props.member.id,
          community_post_id: props.postId,
          vote_type: props.body.vote_type,
          created_at: new Date(),
          updated_at: new Date(),
        },
      });
    } else {
      // UPDATE existing vote direction in place
      await tx.community_post_votes.update({
        where: { id: existingVote.id },
        data: {
          vote_type: props.body.vote_type,
          updated_at: new Date(),
        },
      });
    }
    // Fetch the post author's profile id
    const authorProfile = await tx.community_user_profiles.findUniqueOrThrow({
      where: { community_member_id: post.community_member_id },
      select: { id: true },
    });
    // Incrementally update the post author's karma score
    await tx.community_user_profiles.update({
      where: { id: authorProfile.id },
      data: {
        karma_score: { increment: karmaDelta },
        updated_at: new Date(),
      },
    });
    // Append an immutable karma audit log entry
    await tx.community_user_profile_karma_logs.create({
      data: {
        id: v4(),
        community_user_profile_id: authorProfile.id,
        community_post_vote_id: newVoteId,
        community_comment_vote_id: null,
        source_type: sourceType,
        delta: karmaDelta,
        created_at: new Date(),
      },
    });
  });
  // 7. Fetch the resulting vote record and return as ICommunityPostVote
  const resultVote =
    await MyGlobal.prisma.community_post_votes.findUniqueOrThrow({
      where: { id: newVoteId },
      ...CommunityPostVoteTransformer.select(),
    });
  return CommunityPostVoteTransformer.transform(resultVote);
}
