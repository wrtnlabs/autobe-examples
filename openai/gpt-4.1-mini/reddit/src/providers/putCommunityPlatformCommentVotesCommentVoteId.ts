import { ICommunityPlatformCommentVote } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommentVote";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function putCommunityPlatformCommentVotesCommentVoteId(props: {
  commentVoteId: string & tags.Format<"uuid">;
  body: ICommunityPlatformCommentVote.IUpdate;
}): Promise<ICommunityPlatformCommentVote> {
  // Update the vote_type and updated_at fields for the specific commentVoteId
  await MyGlobal.prisma.community_platform_comment_votes.update({
    where: { id: props.commentVoteId },
    data: {
      vote_type: props.body.vote_type,
      updated_at: new Date(),
    },
  });
  // Fetch the updated vote record to get the community_platform_comment_id
  const updatedVote =
    await MyGlobal.prisma.community_platform_comment_votes.findUniqueOrThrow({
      where: { id: props.commentVoteId },
      select: {
        community_platform_comment_id: true,
      },
    });
  // Aggregate count of upvotes and downvotes for the comment
  const voteCounts =
    await MyGlobal.prisma.community_platform_comment_votes.groupBy({
      by: ["community_platform_comment_id", "vote_type"],
      where: {
        community_platform_comment_id:
          updatedVote.community_platform_comment_id,
      },
      _count: { vote_type: true },
    });
  // Initialize counts
  let upvoteCount = 0;
  let downvoteCount = 0;
  for (const group of voteCounts) {
    if (group.vote_type === "upvote") upvoteCount = group._count.vote_type;
    else if (group.vote_type === "downvote")
      downvoteCount = group._count.vote_type;
  }
  return {
    upvoteCount: upvoteCount satisfies number as number & tags.Type<"int32">,
    downvoteCount: downvoteCount satisfies number as number &
      tags.Type<"int32">,
  } satisfies ICommunityPlatformCommentVote;
}
