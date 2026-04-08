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

export async function deleteRedditCloneMemberPostsPostId(props: {
  member: MemberPayload;
  postId: string & tags.Format<"uuid">;
}): Promise<void> {
  // 1. Find the post
  const post = await MyGlobal.prisma.reddit_clone_posts.findUniqueOrThrow({
    where: { id: props.postId },
    select: {
      id: true,
      reddit_clone_member_id: true,
      vote_score: true,
    },
  });
  // 2. Verify ownership - only author can delete
  if (post.reddit_clone_member_id !== props.member.id) {
    throw new HttpException("Forbidden", 403);
  }
  // 3. Soft delete post and update author karma in transaction
  await MyGlobal.prisma.$transaction([
    // Soft delete the post by setting deleted_at
    MyGlobal.prisma.reddit_clone_posts.update({
      where: { id: props.postId },
      data: {
        deleted_at: new Date(),
      },
    }),
    // Update author karma: subtract the post's vote_score
    MyGlobal.prisma.reddit_clone_user_karmas.update({
      where: { reddit_clone_member_id: post.reddit_clone_member_id },
      data: {
        karma_score: {
          decrement: post.vote_score,
        },
        updated_at: new Date(),
      },
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
// export async function deleteRedditCloneMemberPostsPostId(props: {
//   member: MemberPayload;
//   postId: string & tags.Format<"uuid">;
// }): Promise<void> {
//   await MyGlobal.prisma.....delete({
//     where: { ... },
//   });
// }
// ```
//--------------------------------------------------------------