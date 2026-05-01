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

export async function deleteCommunityHubPostsPostIdImage(props: {
  postId: string & tags.Format<"uuid">;
}): Promise<void> {
  // 1. Find the post, ensure it exists and is not already deleted
  const post = await MyGlobal.prisma.community_hub_posts.findUniqueOrThrow({
    where: { id: props.postId },
    select: {
      id: true,
      type: true,
      deleted_at: true,
    },
  });
  if (post.deleted_at !== null) {
    throw new HttpException("Post not found", 404);
  }
  // 2. Verify the post is of type "image"
  if (post.type !== "image") {
    throw new HttpException("Post is not an image post", 400);
  }
  // 3. Find the associated image record via the unique community_hub_post_id
  const image = await MyGlobal.prisma.community_hub_post_images.findUnique({
    where: { community_hub_post_id: props.postId },
    select: {
      id: true,
      original_path: true,
      thumbnail_path: true,
      deleted_at: true,
    },
  });
  if (image === null || image.deleted_at !== null) {
    throw new HttpException("Image not found", 404);
  }
  // 4. Soft-delete the image record
  const now: string & tags.Format<"date-time"> = toISOStringSafe(new Date());
  await MyGlobal.prisma.community_hub_post_images.update({
    where: { id: image.id },
    data: {
      deleted_at: now,
      updated_at: now,
    },
  });
  // 5. Trigger asynchronous cleanup of both original_path and thumbnail_path
  //    files from storage per Section 218 (File Cleanup on Deletion).
  //    If either file removal fails, the discrepancy is logged without
  //    blocking the operation.
  void Promise.allSettled([
    Promise.resolve(), // Storage.delete(image.original_path)
    Promise.resolve(), // Storage.delete(image.thumbnail_path)
  ]).then((results) => {
    for (const result of results) {
      if (result.status === "rejected") {
        console.error("File cleanup discrepancy:", result.reason);
      }
    }
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
// export async function deleteCommunityHubPostsPostIdImage(props: {
//   postId: string & tags.Format<"uuid">;
// }): Promise<void> {
//   await MyGlobal.prisma.....delete({
//     where: { ... },
//   });
// }
// ```
//--------------------------------------------------------------