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
import { MemberPayload } from "../decorators/payload/MemberPayload";
import { RedditLikeCommunityCommentVoteTransformer } from "../transformers/RedditLikeCommunityCommentVoteTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function putRedditLikeCommunityMemberCommentVotesCommentVoteId(props: {
  member: MemberPayload;
  commentVoteId: string;
  body: IRedditLikeCommunityCommentVote.IUpdate;
}): Promise<IRedditLikeCommunityCommentVote> {
  const existingVote =
    await MyGlobal.prisma.reddit_like_community_comment_votes.findUniqueOrThrow(
      {
        where: { id: props.commentVoteId },
        select: {
          id: true,
          reddit_like_community_member_id: true,
        },
      },
    );
  if (existingVote.reddit_like_community_member_id !== props.member.id) {
    throw new HttpException("Forbidden", 403);
  }
  await MyGlobal.prisma.reddit_like_community_comment_votes.update({
    where: { id: props.commentVoteId },
    data: {
      ...(props.body.direction !== undefined &&
        props.body.direction !== null && { direction: props.body.direction }),
      updated_at: new Date(),
    },
  });
  const updated =
    await MyGlobal.prisma.reddit_like_community_comment_votes.findUniqueOrThrow(
      {
        where: { id: props.commentVoteId },
        ...RedditLikeCommunityCommentVoteTransformer.select(),
      },
    );
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
// export async function putRedditLikeCommunityMemberCommentVotesCommentVoteId(props: {
//   member: MemberPayload;
//   commentVoteId: string;
//   body: IRedditLikeCommunityCommentVote.IUpdate;
// }): Promise<IRedditLikeCommunityCommentVote> {
//   await MyGlobal.prisma.reddit_like_community_comment_votes.update({
//     where: { ... },
//     data: { ... },
//   });
//   const updated = await MyGlobal.prisma.reddit_like_community_comment_votes.findUniqueOrThrow({
//     where: { ... },
//     ...RedditLikeCommunityCommentVoteTransformer.select(),
//   });
//   return await RedditLikeCommunityCommentVoteTransformer.transform(updated);
// }
// ```
//--------------------------------------------------------------