import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IREdditLikeCommunityComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IREdditLikeCommunityComment";
import { IREdditLikeCommunityMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IREdditLikeCommunityMember";
import { IRedditLikeCommunityCommentVote } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeCommunityCommentVote";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { RedditLikeCommunityCommentVoteTransformer } from "../transformers/RedditLikeCommunityCommentVoteTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchRedditLikeCommunityCommentVotes(props: {
  body: IRedditLikeCommunityCommentVote.IUpdate;
}): Promise<IRedditLikeCommunityCommentVote> {
  const commentId = props.body.commentId;
  const direction = props.body.direction;
  if (commentId === undefined) {
    throw new HttpException("commentId is required", 400);
  }
  if (direction === undefined) {
    throw new HttpException("direction is required", 400);
  }
  await MyGlobal.prisma.reddit_like_community_comments.findUniqueOrThrow({
    where: { id: commentId },
    select: { id: true },
  });
  if (direction === null) {
    const existing =
      await MyGlobal.prisma.reddit_like_community_comment_votes.findFirstOrThrow(
        {
          ...RedditLikeCommunityCommentVoteTransformer.select(),
          where: {
            reddit_like_community_comment_id: commentId,
          },
        },
      );
    await MyGlobal.prisma.reddit_like_community_comment_votes.deleteMany({
      where: {
        reddit_like_community_comment_id: commentId,
      },
    });
    return await RedditLikeCommunityCommentVoteTransformer.transform(existing);
  }
  const existing =
    await MyGlobal.prisma.reddit_like_community_comment_votes.findFirst({
      where: {
        reddit_like_community_comment_id: commentId,
      },
      select: { id: true },
    });
  if (existing === null) {
    throw new HttpException("Vote not found for the specified comment", 404);
  }
  const updated =
    await MyGlobal.prisma.reddit_like_community_comment_votes.update({
      where: { id: existing.id },
      data: {
        direction,
        updated_at: toISOStringSafe(new Date()),
      },
      ...RedditLikeCommunityCommentVoteTransformer.select(),
    });
  return await RedditLikeCommunityCommentVoteTransformer.transform(updated);
}


//--------------------------------------------------------------
// TEMPLATE CODE
//--------------------------------------------------------------
// Complete the code below, disregard the import part and return only the function part.
// 
// ```typescript
// import { ArrayUtil } from "@nestia/e2e";
// import { HttpException } from "@nestjs/common";
// import { Prisma } from "@prisma/sdk";
// import jwt from "jsonwebtoken";
// import typia, { tags } from "typia";
// import { v4 } from "uuid";
// import { MyGlobal } from "../MyGlobal";
// import { PasswordUtil } from "../utils/PasswordUtil";
// import { toISOStringSafe } from "../utils/toISOStringSafe"
// 
// import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
// import { IRedditLikeCommunityCommentVote } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeCommunityCommentVote";
// import { IREdditLikeCommunityMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IREdditLikeCommunityMember";
// import { IREdditLikeCommunityComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IREdditLikeCommunityComment";
// 
// // DON'T CHANGE FUNCTION NAME AND PARAMETERS,
// // ONLY YOU HAVE TO WRITE THIS FUNCTION BODY, AND USE IMPORTED.
// export async function patchRedditLikeCommunityCommentVotes(props: {
//   body: IRedditLikeCommunityCommentVote.IUpdate;
// }): Promise<IRedditLikeCommunityCommentVote> {
//   const record = await MyGlobal.prisma.reddit_like_community_comment_votes.findFirstOrThrow({
//     ...RedditLikeCommunityCommentVoteTransformer.select(),
//     where: { ... },
//   });
//   return await RedditLikeCommunityCommentVoteTransformer.transform(record);
// }
// ```
//--------------------------------------------------------------