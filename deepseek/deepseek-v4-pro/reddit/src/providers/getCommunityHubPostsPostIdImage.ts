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

export async function getCommunityHubPostsPostIdImage(props: {
  postId: string & tags.Format<"uuid">;
}): Promise<void> {
  const post = await MyGlobal.prisma.community_hub_posts.findUniqueOrThrow({
    where: { id: props.postId },
    select: { id: true, type: true, deleted_at: true },
  });
  if (post.deleted_at !== null) {
    throw new HttpException("Post not found", 404);
  }
  if (post.type !== "image") {
    throw new HttpException("Post is not an image type", 400);
  }
  const image =
    await MyGlobal.prisma.community_hub_post_images.findUniqueOrThrow({
      where: { community_hub_post_id: props.postId },
      select: { id: true, deleted_at: true },
    });
  if (image.deleted_at !== null) {
    throw new HttpException("Image not found", 404);
  }
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
// export async function getCommunityHubPostsPostIdImage(props: {
//   postId: string & tags.Format<"uuid">;
// }): Promise<void> {
//   // No matching Collector/Transformer found for this operation.
//     // You MUST call getDatabaseSchemas first to get exact relation property names.
//     // NEVER guess relation names from table names — always verify against the schema.
//     ...
// }
// ```
//--------------------------------------------------------------