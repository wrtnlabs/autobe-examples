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
import { CommunityPlatformMemberAtSummaryTransformer } from "../transformers/CommunityPlatformMemberAtSummaryTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function getCommunityPlatformPostsPostIdCommentsCommentIdVotesVoteId(props: {
  postId: string & tags.Format<"uuid">;
  commentId: string & tags.Format<"uuid">;
  voteId: string & tags.Format<"uuid">;
}): Promise<ICommunityPlatformCommentVote> {
  const vote =
    await MyGlobal.prisma.community_platform_comment_votes.findUniqueOrThrow({
      where: { id: props.voteId },
      select: {
        id: true,
        vote_type: true,
        created_at: true,
        updated_at: true,
        deleted_at: true,
        member: CommunityPlatformMemberAtSummaryTransformer.select(),
        comment: {
          select: {
            id: true,
            community_platform_post_id: true,
          },
        } satisfies Prisma.community_platform_commentsFindManyArgs,
      },
    });
  if (vote.deleted_at !== null) {
    throw new HttpException("Vote not found", 404);
  }
  if (vote.comment.id !== props.commentId) {
    throw new HttpException("Vote not found", 404);
  }
  if (vote.comment.community_platform_post_id !== props.postId) {
    throw new HttpException("Vote not found", 404);
  }
  return {
    id: vote.id,
    voteType: vote.vote_type === "upvote" ? "upvote" : "downvote",
    member: await CommunityPlatformMemberAtSummaryTransformer.transform(
      vote.member,
    ),
    createdAt: toISOStringSafe(vote.created_at),
    updatedAt: toISOStringSafe(vote.updated_at),
    deletedAt: null,
  };
}
