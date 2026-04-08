import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
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

export async function deleteRedditPlatformMemberCommentsCommentIdVote(props: {
  member: MemberPayload;
  commentId: string & tags.Format<"uuid">;
}): Promise<void> {
  await MyGlobal.prisma.reddit_platform_comments.findUniqueOrThrow({
    where: {
      id: props.commentId,
      deleted_at: null,
    },
  });
  await MyGlobal.prisma.reddit_platform_comment_votes.findFirstOrThrow({
    where: {
      reddit_platform_comment_id: props.commentId,
      reddit_platform_member_id: props.member.id,
    },
  });
  await MyGlobal.prisma.reddit_platform_comment_votes.update({
    where: {
      reddit_platform_member_id_reddit_platform_comment_id: {
        reddit_platform_comment_id: props.commentId,
        reddit_platform_member_id: props.member.id,
      },
    },
    data: {
      vote_type: null,
      updated_at: toISOStringSafe(new Date()),
    },
  });
  const votes = await MyGlobal.prisma.reddit_platform_comment_votes.findMany({
    where: {
      reddit_platform_comment_id: props.commentId,
    },
  });
  const upvotesCount = votes.filter((v) => v.vote_type === "up").length;
  const downvotesCount = votes.filter((v) => v.vote_type === "down").length;
  const score = upvotesCount - downvotesCount;
  await MyGlobal.prisma.reddit_platform_comments.update({
    where: { id: props.commentId },
    data: {
      upvotes_count: upvotesCount,
      downvotes_count: downvotesCount,
      score: score,
      updated_at: toISOStringSafe(new Date()),
    },
  });
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
// 
// // DON'T CHANGE FUNCTION NAME AND PARAMETERS,
// // ONLY YOU HAVE TO WRITE THIS FUNCTION BODY, AND USE IMPORTED.
// export async function deleteRedditPlatformMemberCommentsCommentIdVote(props: {
//   member: MemberPayload;
//   commentId: string & tags.Format<"uuid">;
// }): Promise<void> {
//   await MyGlobal.prisma.....delete({
//     where: { ... },
//   });
// }
// ```
//--------------------------------------------------------------