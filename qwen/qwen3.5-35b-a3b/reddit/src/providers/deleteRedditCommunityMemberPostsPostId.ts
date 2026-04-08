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

export async function deleteRedditCommunityMemberPostsPostId(props: {
  member: MemberPayload;
  postId: string & tags.Format<"uuid">;
}): Promise<void> {
  const post = await MyGlobal.prisma.reddit_community_posts.findUniqueOrThrow({
    where: { id: props.postId },
    select: {
      id: true,
      reddit_community_member_id: true,
      reddit_community_community_id: true,
      deleted_at: true,
    },
  });
  if (post.deleted_at !== null) {
    throw new HttpException("Post already deleted", 404);
  }
  const isAuthor = post.reddit_community_member_id === props.member.id;
  const isModerator =
    await MyGlobal.prisma.reddit_community_moderator_roles.findFirst({
      where: {
        reddit_community_member_id: props.member.id,
        reddit_community_community_id: post.reddit_community_community_id,
        deleted_at: null,
      },
    });
  if (!isAuthor && !isModerator) {
    throw new HttpException("Forbidden", 403);
  }
  await MyGlobal.prisma.reddit_community_posts.update({
    where: { id: props.postId },
    data: {
      deleted_at: new Date(),
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
// export async function deleteRedditCommunityMemberPostsPostId(props: {
//   member: MemberPayload;
//   postId: string & tags.Format<"uuid">;
// }): Promise<void> {
//   await MyGlobal.prisma.....delete({
//     where: { ... },
//   });
// }
// ```
//--------------------------------------------------------------