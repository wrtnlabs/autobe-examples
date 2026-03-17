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
import { CommunityPlatformCommentVoteCollector } from "../collectors/CommunityPlatformCommentVoteCollector";
import { MemberPayload } from "../decorators/payload/MemberPayload";
import { CommunityPlatformCommentVoteTransformer } from "../transformers/CommunityPlatformCommentVoteTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function postCommunityPlatformMemberPostsPostIdCommentsCommentIdVote(props: {
  member: MemberPayload;
  postId: string & tags.Format<"uuid">;
  commentId: string & tags.Format<"uuid">;
  body: ICommunityPlatformCommentVote.ICreate;
}): Promise<ICommunityPlatformCommentVote> {
  const comment =
    await MyGlobal.prisma.community_platform_comments.findUniqueOrThrow({
      where: { id: props.commentId },
      select: {
        id: true,
        community_platform_post_id: true,
        community_platform_member_id: true,
      },
    });
  if (comment.community_platform_post_id !== props.postId) {
    throw new HttpException("Comment does not belong to this post", 400);
  }
  const commentAuthorId = comment.community_platform_member_id;
  const existingVote =
    await MyGlobal.prisma.community_platform_comment_votes.findUnique({
      where: {
        community_platform_comment_id_community_platform_member_id: {
          community_platform_comment_id: props.commentId,
          community_platform_member_id: props.member.id,
        },
      },
    });
  if (existingVote) {
    if (existingVote.vote_type === props.body.vote_type) {
      const updatedVote =
        await MyGlobal.prisma.community_platform_comment_votes.update({
          where: { id: existingVote.id },
          data: { updated_at: new Date() },
          ...CommunityPlatformCommentVoteTransformer.select(),
        });
      return CommunityPlatformCommentVoteTransformer.transform(updatedVote);
    }
    let voteDelta = 0;
    switch (existingVote.vote_type) {
      case "upvote":
        if (props.body.vote_type === "downvote") {
          voteDelta = -2;
        }
        break;
      case "downvote":
        if (props.body.vote_type === "upvote") {
          voteDelta = 2;
        }
        break;
    }
    const updatedVote =
      await MyGlobal.prisma.community_platform_comment_votes.update({
        where: { id: existingVote.id },
        data: {
          vote_type: props.body.vote_type,
          updated_at: new Date(),
        },
        ...CommunityPlatformCommentVoteTransformer.select(),
      });
    await MyGlobal.prisma.community_platform_comments.update({
      where: { id: props.commentId },
      data: { vote_score: { increment: voteDelta } },
    });
    await MyGlobal.prisma.community_platform_members.update({
      where: { id: commentAuthorId },
      data: { karma: { increment: voteDelta } },
    });
    return CommunityPlatformCommentVoteTransformer.transform(updatedVote);
  }
  const vote = await MyGlobal.prisma.community_platform_comment_votes.create({
    data: await CommunityPlatformCommentVoteCollector.collect({
      body: props.body,
      communityPlatformComments: { id: props.commentId },
      communityPlatformMembers: { id: props.member.id },
      communityPlatformMemberSessions: { id: props.member.session_id },
    }),
    ...CommunityPlatformCommentVoteTransformer.select(),
  });
  const voteScoreDelta = props.body.vote_type === "upvote" ? 1 : -1;
  await MyGlobal.prisma.community_platform_comments.update({
    where: { id: props.commentId },
    data: { vote_score: { increment: voteScoreDelta } },
  });
  await MyGlobal.prisma.community_platform_members.update({
    where: { id: commentAuthorId },
    data: { karma: { increment: voteScoreDelta } },
  });
  return CommunityPlatformCommentVoteTransformer.transform(vote);
}
