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
import { CommunityPlatformMemberAtSummaryTransformer } from "../transformers/CommunityPlatformMemberAtSummaryTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function postCommunityPlatformMemberPostsPostIdCommentsCommentIdVotes(props: {
  member: MemberPayload;
  postId: string & tags.Format<"uuid">;
  commentId: string & tags.Format<"uuid">;
  body: ICommunityPlatformCommentVote.ICreate;
}): Promise<ICommunityPlatformCommentVote> {
  await MyGlobal.prisma.community_platform_posts.findUniqueOrThrow({
    where: { id: props.postId },
    select: { id: true },
  });
  await MyGlobal.prisma.community_platform_comments.findFirstOrThrow({
    where: {
      id: props.commentId,
      community_platform_post_id: props.postId,
    },
    select: { id: true },
  });
  const vote = await MyGlobal.prisma.$transaction(async (tx) => {
    const existing = await tx.community_platform_comment_votes.findFirst({
      where: {
        comment_id: props.commentId,
        voter_id: props.member.id,
      },
      select: { id: true },
    });
    if (existing === null) {
      const created = await tx.community_platform_comment_votes.create({
        data: {
          id: v4(),
          vote_direction: props.body.vote_direction,
          voted_at: new Date(),
          created_at: new Date(),
          updated_at: new Date(),
          deleted_at: null,
          comment: { connect: { id: props.commentId } },
          voter: { connect: { id: props.member.id } },
        },
        select: {
          id: true,
          comment_id: true,
          voter: CommunityPlatformMemberAtSummaryTransformer.select(),
          vote_direction: true,
          voted_at: true,
          created_at: true,
          updated_at: true,
          deleted_at: true,
        },
      });
      return created;
    }
    const updated = await tx.community_platform_comment_votes.update({
      where: { id: existing.id },
      data: {
        vote_direction: props.body.vote_direction,
        voted_at: new Date(),
        updated_at: new Date(),
        deleted_at: null,
      },
      select: {
        id: true,
        comment_id: true,
        voter: CommunityPlatformMemberAtSummaryTransformer.select(),
        vote_direction: true,
        voted_at: true,
        created_at: true,
        updated_at: true,
        deleted_at: true,
      },
    });
    return updated;
  });
  return await CommunityPlatformCommentVoteTransformer.transform(vote);
}
