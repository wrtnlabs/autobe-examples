import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IRedditPlatformPostVoteStatus } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformPostVoteStatus";
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

export async function getRedditPlatformMemberPostsPostIdVote(props: {
  member: MemberPayload;
  postId: string & tags.Format<"uuid">;
}): Promise<IRedditPlatformPostVoteStatus> {
  // Validate post exists
  await MyGlobal.prisma.reddit_platform_posts.findUniqueOrThrow({
    where: { id: props.postId },
    select: { id: true },
  });
  // Query vote record for this member on this post
  const voteRecord = await MyGlobal.prisma.reddit_platform_post_votes.findFirst(
    {
      where: {
        reddit_platform_member_id: props.member.id,
        reddit_platform_post_id: props.postId,
      },
    },
  );
  if (voteRecord === null) {
    // No vote exists - return null for voteType and voteTimestamp
    return {
      postId: props.postId,
      voteType: null,
      voteTimestamp: null,
    };
  }
  // Vote record exists - return vote details
  return {
    postId: props.postId,
    voteType:
      voteRecord.vote_type === "up" || voteRecord.vote_type === "down"
        ? (voteRecord.vote_type as "up" | "down")
        : null,
    voteTimestamp: toISOStringSafe(voteRecord.created_at),
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
// import { IRedditPlatformPostVoteStatus } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformPostVoteStatus";
// 
// // DON'T CHANGE FUNCTION NAME AND PARAMETERS,
// // ONLY YOU HAVE TO WRITE THIS FUNCTION BODY, AND USE IMPORTED.
// export async function getRedditPlatformMemberPostsPostIdVote(props: {
//   member: MemberPayload;
//   postId: string & tags.Format<"uuid">;
// }): Promise<IRedditPlatformPostVoteStatus> {
//   // No matching Collector/Transformer found for this operation.
//     // You MUST call getDatabaseSchemas first to get exact relation property names.
//     // NEVER guess relation names from table names — always verify against the schema.
//     ...
// }
// ```
//--------------------------------------------------------------