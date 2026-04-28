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

export async function postRedditLikeCommunityMemberVotesCommentsCommentIdDownvote(props: {
  member: MemberPayload;
  commentId: string & tags.Format<"uuid">;
}): Promise<IRedditLikeCommunityCommentVote> {
  const vote = await MyGlobal.prisma.reddit_like_community_comment_votes.upsert(
    {
      ...RedditLikeCommunityCommentVoteTransformer.select(),
      where: {
        reddit_like_community_member_id_reddit_like_community_comment_id: {
          reddit_like_community_member_id: props.member.id,
          reddit_like_community_comment_id: props.commentId,
        },
      },
      update: {
        direction: "downvote",
        updated_at: new Date(),
      },
      create: {
        id: v4(),
        direction: "downvote",
        member: {
          connect: {
            id: props.member.id,
          },
        },
        comment: {
          connect: {
            id: props.commentId,
          },
        },
        created_at: new Date(),
        updated_at: new Date(),
      },
    },
  );
  return await RedditLikeCommunityCommentVoteTransformer.transform(vote);
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
// export async function postRedditLikeCommunityMemberVotesCommentsCommentIdDownvote(props: {
//   member: MemberPayload;
//   commentId: string & tags.Format<"uuid">;
// }): Promise<IRedditLikeCommunityCommentVote> {
//   const record = await MyGlobal.prisma.reddit_like_community_comment_votes.findFirstOrThrow({
//     ...RedditLikeCommunityCommentVoteTransformer.select(),
//     where: { ... },
//   });
//   return await RedditLikeCommunityCommentVoteTransformer.transform(record);
// }
// ```
//--------------------------------------------------------------