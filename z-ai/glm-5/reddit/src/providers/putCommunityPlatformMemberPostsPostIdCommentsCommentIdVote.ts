import { ICommunityPlatformCommentVote } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommentVote";
import { ICommunityPlatformFile } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformFile";
import { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { MemberPayload } from "../decorators/payload/MemberPayload";
import { CommunityPlatformCommentVoteTransformer } from "../transformers/CommunityPlatformCommentVoteTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function putCommunityPlatformMemberPostsPostIdCommentsCommentIdVote(props: {
  member: MemberPayload;
  postId: string & tags.Format<"uuid">;
  commentId: string & tags.Format<"uuid">;
  body: ICommunityPlatformCommentVote.ICreate;
}): Promise<ICommunityPlatformCommentVote> {
  // Verify comment exists and belongs to the post
  const comment =
    await MyGlobal.prisma.community_platform_comments.findUniqueOrThrow({
      where: { id: props.commentId },
      select: {
        id: true,
        community_platform_post_id: true,
        community_platform_member_id: true,
        vote_score: true,
      },
    });
  if (comment.community_platform_post_id !== props.postId) {
    throw new HttpException("Comment does not belong to this post", 404);
  }
  // Check for existing active vote
  const existingVote =
    await MyGlobal.prisma.community_platform_comment_votes.findUnique({
      where: {
        community_platform_comment_id_community_platform_member_id: {
          community_platform_comment_id: props.commentId,
          community_platform_member_id: props.member.id,
        },
      },
      select: {
        id: true,
        vote_type: true,
        deleted_at: true,
      },
    });
  // Filter out soft-deleted votes
  const activeVote = existingVote?.deleted_at === null ? existingVote : null;
  const now = new Date();
  const voteId = activeVote?.id ?? v4();
  if (activeVote === null) {
    // No existing active vote - create new
    const karmaDelta = props.body.vote_type === "upvote" ? 1 : -1;
    const voteScoreDelta = props.body.vote_type === "upvote" ? 1 : -1;
    await MyGlobal.prisma.$transaction([
      MyGlobal.prisma.community_platform_comment_votes.create({
        data: {
          id: voteId,
          community_platform_comment_id: props.commentId,
          community_platform_member_id: props.member.id,
          vote_type: props.body.vote_type,
          created_at: now,
          updated_at: now,
          deleted_at: null,
        },
      }),
      MyGlobal.prisma.community_platform_members.update({
        where: { id: comment.community_platform_member_id },
        data: { karma: { increment: karmaDelta } },
      }),
      MyGlobal.prisma.community_platform_comments.update({
        where: { id: props.commentId },
        data: { vote_score: { increment: voteScoreDelta } },
      }),
    ]);
  } else {
    // Existing active vote found
    if (activeVote.vote_type === props.body.vote_type) {
      // Same vote type - no change needed
    } else {
      // Different vote type - update and adjust karma by 2
      const karmaDelta = props.body.vote_type === "upvote" ? 2 : -2;
      const voteScoreDelta = props.body.vote_type === "upvote" ? 2 : -2;
      await MyGlobal.prisma.$transaction([
        MyGlobal.prisma.community_platform_comment_votes.update({
          where: { id: activeVote.id },
          data: {
            vote_type: props.body.vote_type,
            updated_at: now,
          },
        }),
        MyGlobal.prisma.community_platform_members.update({
          where: { id: comment.community_platform_member_id },
          data: { karma: { increment: karmaDelta } },
        }),
        MyGlobal.prisma.community_platform_comments.update({
          where: { id: props.commentId },
          data: { vote_score: { increment: voteScoreDelta } },
        }),
      ]);
    }
  }
  // Fetch the vote with relations for response
  const vote =
    await MyGlobal.prisma.community_platform_comment_votes.findUniqueOrThrow({
      where: { id: voteId },
      ...CommunityPlatformCommentVoteTransformer.select(),
    });
  return await CommunityPlatformCommentVoteTransformer.transform(vote);
}
