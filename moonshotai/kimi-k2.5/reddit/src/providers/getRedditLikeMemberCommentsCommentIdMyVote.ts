import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IRedditLikeMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeMember";
import { IRedditLikeVote } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeVote";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { AdminPayload } from "../decorators/payload/AdminPayload";
import { RedditLikeVoteTransformer } from "../transformers/RedditLikeVoteTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function getRedditLikeMemberCommentsCommentIdMyVote(props: {
  member: AdminPayload;
  commentId: string & tags.Format<"uuid">;
}): Promise<IRedditLikeVote> {
  // Verify comment exists
  await MyGlobal.prisma.reddit_like_comments.findUniqueOrThrow({
    where: { id: props.commentId },
  });
  // Query vote through reddit_like_comment_votes join table
  const commentVote = await MyGlobal.prisma.reddit_like_comment_votes.findFirst(
    {
      where: {
        comment_id: props.commentId,
        vote: {
          member_id: props.member.id,
        },
      },
      select: {
        vote: RedditLikeVoteTransformer.select(),
      },
    },
  );
  if (commentVote === null) {
    throw new HttpException("Vote not found", 404);
  }
  return await RedditLikeVoteTransformer.transform(commentVote.vote);
}
