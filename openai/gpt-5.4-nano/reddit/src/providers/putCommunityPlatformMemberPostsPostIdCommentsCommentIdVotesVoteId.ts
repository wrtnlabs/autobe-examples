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

export async function putCommunityPlatformMemberPostsPostIdCommentsCommentIdVotesVoteId(props: {
  member: MemberPayload;
  postId: string & tags.Format<"uuid">;
  commentId: string & tags.Format<"uuid">;
  voteId: string & tags.Format<"uuid">;
  body: ICommunityPlatformCommentVote.IUpdate;
}): Promise<ICommunityPlatformCommentVote> {
  const { member, postId, commentId, voteId, body } = props;
  return await MyGlobal.prisma.$transaction(async (tx) => {
    const comment = await tx.community_platform_comments.findUniqueOrThrow({
      where: { id: commentId },
      select: { id: true, community_platform_post_id: true },
    });
    if (comment.community_platform_post_id !== postId) {
      throw new HttpException("Forbidden", 403);
    }
    const existingVote =
      await tx.community_platform_comment_votes.findUniqueOrThrow({
        where: { id: voteId },
        select: { id: true, comment_id: true, voter_id: true },
      });
    if (
      existingVote.comment_id !== commentId ||
      existingVote.voter_id !== member.id
    ) {
      throw new HttpException("Forbidden", 403);
    }
    const updated = await tx.community_platform_comment_votes.update({
      where: { id: voteId },
      data: {
        ...(body.voteDirection !== undefined
          ? {
              vote_direction: body.voteDirection,
              deleted_at: body.voteDirection === 0 ? new Date() : null,
            }
          : {}),
        voted_at: new Date(),
        updated_at: new Date(),
      },
      ...CommunityPlatformCommentVoteTransformer.select(),
    });
    return await CommunityPlatformCommentVoteTransformer.transform(updated);
  });
}
