import { ICommunityComment } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityComment";
import { ICommunityCommentVote } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityCommentVote";
import { ICommunityCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityCommunity";
import { ICommunityMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityMember";
import { ICommunityPost } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPost";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { CommunityCommentVoteCollector } from "../collectors/CommunityCommentVoteCollector";
import { MemberPayload } from "../decorators/payload/MemberPayload";
import { CommunityCommentVoteTransformer } from "../transformers/CommunityCommentVoteTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function postCommunityMemberPostsPostIdCommentsCommentIdVotes(props: {
  member: MemberPayload;
  postId: string & tags.Format<"uuid">;
  commentId: string & tags.Format<"uuid">;
  body: ICommunityCommentVote.ICreate;
}): Promise<ICommunityCommentVote> {
  // Step 1: Validate post exists and is not deleted
  const post = await MyGlobal.prisma.community_posts.findUniqueOrThrow({
    where: { id: props.postId },
    select: { id: true, deleted_at: true },
  });
  if (post.deleted_at !== null) {
    throw new HttpException("Post not found", 404);
  }
  // Step 2: Validate comment exists, belongs to post, and is not deleted
  const comment = await MyGlobal.prisma.community_comments.findFirstOrThrow({
    where: { id: props.commentId, post_id: props.postId },
    select: { id: true, deleted_at: true, member_id: true },
  });
  if (comment.deleted_at !== null) {
    throw new HttpException("Comment not found", 404);
  }
  // Step 3: Self-vote check — member cannot vote on their own comment
  if (comment.member_id === props.member.id) {
    throw new HttpException("Cannot vote on your own comment", 403);
  }
  // Step 4: Duplicate active vote check
  const existingVote = await MyGlobal.prisma.community_comment_votes.findFirst({
    where: {
      community_member_id: props.member.id,
      community_comment_id: props.commentId,
      deleted_at: null,
    },
    select: { id: true },
  });
  if (existingVote !== null) {
    throw new HttpException("Active vote already exists on this comment", 409);
  }
  // Step 5: Create the vote record using Collector + Transformer
  const created = await MyGlobal.prisma.community_comment_votes.create({
    data: await CommunityCommentVoteCollector.collect({
      body: props.body,
      communityMembers: { id: props.member.id },
      communityMemberSessions: { id: props.member.session_id },
      communityComments: { id: props.commentId },
    }),
    ...CommunityCommentVoteTransformer.select(),
  });
  // Step 6: Update comment author's karma score
  const authorProfile = await MyGlobal.prisma.community_user_profiles.findFirst(
    {
      where: { community_member_id: comment.member_id },
      select: { id: true },
    },
  );
  if (authorProfile !== null) {
    const delta = props.body.voteType === "up" ? 1 : -1;
    const sourceType =
      props.body.voteType === "up"
        ? "comment_upvote_received"
        : "comment_downvote_received";
    await MyGlobal.prisma.community_user_profile_karma_logs.create({
      data: {
        id: v4(),
        community_user_profile_id: authorProfile.id,
        community_comment_vote_id: created.id,
        community_post_vote_id: null,
        source_type: sourceType,
        delta,
        created_at: new Date(),
      },
    });
    await MyGlobal.prisma.community_user_profiles.update({
      where: { id: authorProfile.id },
      data: {
        karma_score: { increment: delta },
        updated_at: new Date(),
      },
    });
  }
  // Step 7: Return transformed response
  return CommunityCommentVoteTransformer.transform(created);
}
