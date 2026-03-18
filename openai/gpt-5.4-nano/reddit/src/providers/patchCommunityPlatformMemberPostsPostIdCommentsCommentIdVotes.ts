import { ICommunityPlatformCommentVote } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommentVote";
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

export async function patchCommunityPlatformMemberPostsPostIdCommentsCommentIdVotes(props: {
  member: MemberPayload;
  postId: string & tags.Format<"uuid">;
  commentId: string & tags.Format<"uuid">;
  body: ICommunityPlatformCommentVote.IRequest;
}): Promise<ICommunityPlatformCommentVote> {
  const voteDirection = props.body.direction;
  const removeIntent = voteDirection === 0;
  const nowIso = toISOStringSafe(new Date());
  const nowForPrisma = new Date(nowIso);
  await MyGlobal.prisma.community_platform_posts.findUniqueOrThrow({
    where: { id: props.postId },
    select: { id: true },
  });
  const comment =
    await MyGlobal.prisma.community_platform_comments.findUniqueOrThrow({
      where: { id: props.commentId },
      select: { id: true, community_platform_post_id: true },
    });
  if (comment.community_platform_post_id !== props.postId) {
    throw new HttpException(
      "Comment does not belong to the specified post",
      404,
    );
  }
  const voterId = props.member.id;
  return await MyGlobal.prisma.$transaction(async (tx) => {
    const existingActive = await tx.community_platform_comment_votes.findFirst({
      where: {
        comment_id: props.commentId,
        voter_id: voterId,
        deleted_at: null,
      },
      select: { id: true },
    });
    if (existingActive === null) {
      // Neutral/reset without an existing active vote: create a removed record so we can
      // return a consistent DTO without leaving an active row.
      const created = await tx.community_platform_comment_votes.create({
        data: {
          id: typia.assert<string & tags.Format<"uuid">>(v4()),
          comment_id: props.commentId,
          voter_id: voterId,
          vote_direction: voteDirection,
          voted_at: nowForPrisma,
          created_at: nowForPrisma,
          updated_at: nowForPrisma,
          deleted_at: removeIntent ? nowForPrisma : null,
        },
        ...CommunityPlatformCommentVoteTransformer.select(),
      });
      return await CommunityPlatformCommentVoteTransformer.transform(created);
    }
    if (removeIntent) {
      await tx.community_platform_comment_votes.update({
        where: { id: existingActive.id },
        data: {
          deleted_at: nowForPrisma,
          updated_at: nowForPrisma,
        },
      });
    } else {
      await tx.community_platform_comment_votes.update({
        where: { id: existingActive.id },
        data: {
          vote_direction: voteDirection,
          voted_at: nowForPrisma,
          deleted_at: null,
          updated_at: nowForPrisma,
        },
      });
    }
    const updated = await tx.community_platform_comment_votes.findFirstOrThrow({
      where: {
        comment_id: props.commentId,
        voter_id: voterId,
      },
      ...CommunityPlatformCommentVoteTransformer.select(),
    });
    return await CommunityPlatformCommentVoteTransformer.transform(updated);
  });
}
