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

export async function deleteRedditCloneMemberPostsPostIdVotes(props: {
  member: MemberPayload;
  postId: string & tags.Format<"uuid">;
}): Promise<void> {
  const vote = await MyGlobal.prisma.reddit_clone_post_votes.findFirst({
    where: {
      reddit_clone_member_id: props.member.id,
      reddit_clone_post_id: props.postId,
    },
    select: {
      id: true,
      direction: true,
      post: {
        select: {
          id: true,
          reddit_clone_member_id: true,
        },
      },
    },
  });
  if (vote === null) {
    throw new HttpException("Vote not found", 404);
  }
  const voteDirection = vote.direction;
  const postAuthorId = vote.post.reddit_clone_member_id;
  await MyGlobal.prisma.$transaction([
    MyGlobal.prisma.reddit_clone_post_votes.delete({
      where: { id: vote.id },
    }),
    MyGlobal.prisma.reddit_clone_posts.update({
      where: { id: props.postId },
      data: {
        vote_score:
          voteDirection === "upvote" ? { decrement: 1 } : { increment: 1 },
      },
    }),
    MyGlobal.prisma.reddit_clone_user_karmas.update({
      where: { reddit_clone_member_id: postAuthorId },
      data: {
        karma_score:
          voteDirection === "upvote" ? { decrement: 1 } : { increment: 1 },
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
// export async function deleteRedditCloneMemberPostsPostIdVotes(props: {
//   member: MemberPayload;
//   postId: string & tags.Format<"uuid">;
// }): Promise<void> {
//   await MyGlobal.prisma.....delete({
//     where: { ... },
//   });
// }
// ```
//--------------------------------------------------------------