import { ICommunityPlatformComment } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformComment";
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

export async function putCommunityPlatformMemberCommentsCommentIdVotesCommentVoteId(props: {
  member: MemberPayload;
  commentId: string & tags.Format<"uuid">;
  commentVoteId: string & tags.Format<"uuid">;
  body: ICommunityPlatformCommentVote.IUpdate;
}): Promise<ICommunityPlatformCommentVote> {
  return await MyGlobal.prisma.$transaction(async (tx) => {
    await tx.community_platform_comments.findUniqueOrThrow({
      where: { id: props.commentId },
      select: { id: true },
    });
    const vote = await tx.community_platform_comment_votes.findUniqueOrThrow({
      where: { id: props.commentVoteId },
      select: {
        id: true,
        community_platform_comment_id: true,
        community_platform_member_id: true,
        direction: true,
        deleted_at: true,
      },
    });
    if (vote.deleted_at !== null) {
      throw new HttpException("Not Found", 404);
    }
    if (vote.community_platform_comment_id !== props.commentId) {
      throw new HttpException("Not Found", 404);
    }
    if (vote.community_platform_member_id !== props.member.id) {
      throw new HttpException("Forbidden", 403);
    }
    if (vote.direction !== props.body.direction) {
      await tx.community_platform_comment_votes.update({
        where: { id: props.commentVoteId },
        data: {
          direction: props.body.direction,
          updated_at: new Date().toISOString(),
        },
      });
    }
    const updated = await tx.community_platform_comment_votes.findUniqueOrThrow(
      {
        where: { id: props.commentVoteId },
        ...CommunityPlatformCommentVoteTransformer.select(),
      },
    );
    return await CommunityPlatformCommentVoteTransformer.transform(updated);
  });
}
