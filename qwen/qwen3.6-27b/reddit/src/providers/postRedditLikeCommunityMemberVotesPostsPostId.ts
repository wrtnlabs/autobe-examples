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

export async function postRedditLikeCommunityMemberVotesPostsPostId(props: {
  member: MemberPayload;
  postId: string & tags.Format<"uuid">;
}): Promise<void> {
  // 1. Validate post exists and is not soft-deleted
  const post =
    await MyGlobal.prisma.reddit_like_community_posts.findUniqueOrThrow({
      where: { id: props.postId },
      select: {
        author_id: true,
        deleted_at: true,
      },
    });
  if (post.deleted_at !== null) {
    throw new HttpException("Not Found", 404);
  }
  // 2. Lookup existing vote by composite unique key
  const existingVote =
    await MyGlobal.prisma.reddit_like_community_post_votes.findFirst({
      where: {
        reddit_like_community_member_id: props.member.id,
        reddit_like_community_post_id: props.postId,
      },
    });
  // 3. Already upvoted — idempotent, no changes
  if (existingVote?.direction === "up") {
    return;
  }
  // 4. Determine operation mode
  const isNewVote = existingVote === null;
  // 5. Execute atomic transaction: vote mutation + karma update
  await MyGlobal.prisma.$transaction([
    // Create new upvote or flip downvote to up
    isNewVote
      ? MyGlobal.prisma.reddit_like_community_post_votes.create({
          data: {
            id: v4(),
            direction: "up",
            created_at: new Date(),
            updated_at: new Date(),
            member: { connect: { id: props.member.id } },
            post: { connect: { id: props.postId } },
          },
        })
      : MyGlobal.prisma.reddit_like_community_post_votes.update({
          where: {
            reddit_like_community_member_id_reddit_like_community_post_id: {
              reddit_like_community_member_id: props.member.id,
              reddit_like_community_post_id: props.postId,
            },
          },
          data: {
            direction: "up",
            updated_at: new Date(),
          },
        }),
    // Increment author's karma: +1 for new vote, +2 for flip from down to up
    MyGlobal.prisma.reddit_like_community_profiles.update({
      where: { reddit_like_community_member_id: post.author_id },
      data: { karma: { increment: isNewVote ? 1 : 2 } },
    }),
  ]);
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
// export async function postRedditLikeCommunityMemberVotesPostsPostId(props: {
//   member: MemberPayload;
//   postId: string & tags.Format<"uuid">;
// }): Promise<void> {
//   // No matching Collector/Transformer found for this operation.
//     // You MUST call getDatabaseSchemas first to get exact relation property names.
//     // NEVER guess relation names from table names — always verify against the schema.
//     ...
// }
// ```
//--------------------------------------------------------------