import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function deleteCommunityHubPostsPostId(props: {
  postId: string & tags.Format<"uuid">;
}): Promise<void> {
  const post = await MyGlobal.prisma.community_hub_posts.findFirst({
    where: {
      id: props.postId,
      deleted_at: null,
    },
  });
  if (post === null) {
    throw new HttpException("Post not found", 404);
  }
  const now = new Date().toISOString();
  await MyGlobal.prisma.$transaction([
    MyGlobal.prisma.community_hub_posts.update({
      where: { id: props.postId },
      data: { deleted_at: now },
    }),
    MyGlobal.prisma.community_hub_comments.updateMany({
      where: {
        community_hub_post_id: props.postId,
        deleted_at: null,
      },
      data: { deleted_at: now },
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
// export async function deleteCommunityHubPostsPostId(props: {
//   postId: string & tags.Format<"uuid">;
// }): Promise<void> {
//   await MyGlobal.prisma.....delete({
//     where: { ... },
//   });
// }
// ```
//--------------------------------------------------------------