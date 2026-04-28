import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IREdditLikeCommunityCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IREdditLikeCommunityCommunity";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { MemberPayload } from "../decorators/payload/MemberPayload";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function getRedditLikeCommunityMemberCommentsCommentIdVotes(props: {
  member: MemberPayload;
  commentId: string & tags.Format<"uuid">;
}): Promise<IREdditLikeCommunityCommunity.ICommentVoteCheck> {
  await MyGlobal.prisma.reddit_like_community_comments.findUniqueOrThrow({
    where: { id: props.commentId },
  });
  const memberVote =
    await MyGlobal.prisma.reddit_like_community_comment_votes.findFirst({
      where: {
        reddit_like_community_comment_id: props.commentId,
        reddit_like_community_member_id: props.member.id,
      },
      select: { direction: true },
    });
  const voteCounts =
    await MyGlobal.prisma.reddit_like_community_comment_votes.groupBy({
      by: ["direction"],
      where: { reddit_like_community_comment_id: props.commentId },
      _count: { direction: true },
    });
  const upvotes =
    voteCounts.find((v) => v.direction === "upvote")?._count.direction ?? 0;
  const downvotes =
    voteCounts.find((v) => v.direction === "downvote")?._count.direction ?? 0;
  return {
    memberVoteDirection:
      memberVote !== null
        ? typia.assert<"upvote" | "downvote">(memberVote.direction)
        : null,
    score: upvotes - downvotes,
  };
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
// import { IREdditLikeCommunityCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IREdditLikeCommunityCommunity";
// 
// // DON'T CHANGE FUNCTION NAME AND PARAMETERS,
// // ONLY YOU HAVE TO WRITE THIS FUNCTION BODY, AND USE IMPORTED.
// export async function getRedditLikeCommunityMemberCommentsCommentIdVotes(props: {
//   member: MemberPayload;
//   commentId: string & tags.Format<"uuid">;
// }): Promise<IREdditLikeCommunityCommunity.ICommentVoteCheck> {
//   // No matching Collector/Transformer found for this operation.
//     // You MUST call getDatabaseSchemas first to get exact relation property names.
//     // NEVER guess relation names from table names — always verify against the schema.
//     ...
// }
// ```
//--------------------------------------------------------------