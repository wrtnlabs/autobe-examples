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

export async function deleteRedditPlatformMemberPostsPostIdVote(props: {
  member: MemberPayload;
  postId: string & tags.Format<"uuid">;
}): Promise<void> {
  // 1. Verify post exists and is not deleted
  const post = await MyGlobal.prisma.reddit_platform_posts.findFirst({
    where: {
      id: props.postId,
      deleted_at: null,
    },
    select: { id: true, upvotes_count: true, downvotes_count: true },
  });
  if (post === null) {
    throw new HttpException("Post not found", 404);
  }
  // 2. Find the vote record for this user-post combination
  const vote = await MyGlobal.prisma.reddit_platform_post_votes.findFirst({
    where: {
      reddit_platform_post_id: props.postId,
      reddit_platform_member_id: props.member.id,
    },
    select: { id: true, vote_type: true },
  });
  if (vote === null) {
    throw new HttpException("Vote not found", 409);
  }
  // 3. Delete the vote record
  await MyGlobal.prisma.reddit_platform_post_votes.delete({
    where: { id: vote.id },
  });
  // 4. Recalculate the post's vote counts
  const upvotesCount = await MyGlobal.prisma.reddit_platform_post_votes.count({
    where: {
      reddit_platform_post_id: props.postId,
      vote_type: "up",
    },
  });
  const downvotesCount = await MyGlobal.prisma.reddit_platform_post_votes.count(
    {
      where: {
        reddit_platform_post_id: props.postId,
        vote_type: "down",
      },
    },
  );
  // 5. Update the post with new counts
  await MyGlobal.prisma.reddit_platform_posts.update({
    where: { id: props.postId },
    data: {
      upvotes_count: upvotesCount,
      downvotes_count: downvotesCount,
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
// export async function deleteRedditPlatformMemberPostsPostIdVote(props: {
//   member: MemberPayload;
//   postId: string & tags.Format<"uuid">;
// }): Promise<void> {
//   await MyGlobal.prisma.....delete({
//     where: { ... },
//   });
// }
// ```
//--------------------------------------------------------------