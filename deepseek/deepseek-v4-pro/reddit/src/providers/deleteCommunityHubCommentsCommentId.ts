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

export async function deleteCommunityHubCommentsCommentId(props: {
  commentId: string & tags.Format<"uuid">;
}): Promise<void> {
  const comment =
    await MyGlobal.prisma.community_hub_comments.findUniqueOrThrow({
      where: { id: props.commentId },
      select: {
        id: true,
        deleted_at: true,
        community_hub_post_id: true,
      },
    });
  if (comment.deleted_at !== null) {
    throw new HttpException("The comment no longer exists", 409);
  }
  await MyGlobal.prisma.$transaction(async (tx) => {
    await tx.community_hub_comments.update({
      where: { id: props.commentId },
      data: { deleted_at: new Date() },
    });
    await tx.community_hub_comments.updateMany({
      where: { community_hub_parent_comment_id: props.commentId },
      data: { community_hub_parent_comment_id: null },
    });
    await tx.community_hub_posts.update({
      where: { id: comment.community_hub_post_id },
      data: { comment_count: { decrement: 1 } },
    });
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
// export async function deleteCommunityHubCommentsCommentId(props: {
//   commentId: string & tags.Format<"uuid">;
// }): Promise<void> {
//   await MyGlobal.prisma.....delete({
//     where: { ... },
//   });
// }
// ```
//--------------------------------------------------------------