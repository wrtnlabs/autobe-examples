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
import { MemberPayload } from "../decorators/payload/MemberPayload";
import { RedditLikeVoteTransformer } from "../transformers/RedditLikeVoteTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function getRedditLikeMemberCommentsCommentIdMyVote(props: {
  member: MemberPayload;
  commentId: string & tags.Format<"uuid">;
}): Promise<IRedditLikeVote | null> {
  // Verify comment exists
  await MyGlobal.prisma.reddit_like_comments.findUniqueOrThrow({
    where: { id: props.commentId },
  });
  // Find the member's vote on this comment through the polymorphic relationship
  const vote = await MyGlobal.prisma.reddit_like_votes.findFirst({
    where: {
      member_id: props.member.id,
      commentVote: {
        comment_id: props.commentId,
      },
    },
    ...RedditLikeVoteTransformer.select(),
  });
  if (vote === null) {
    return null;
  }
  return await RedditLikeVoteTransformer.transform(vote);
}
