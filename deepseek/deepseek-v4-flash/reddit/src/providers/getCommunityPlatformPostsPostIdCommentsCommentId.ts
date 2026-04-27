import { ICommunityPlatformComment } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformComment";
import { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { CommunityPlatformCommentTransformer } from "../transformers/CommunityPlatformCommentTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

// DON'T CHANGE FUNCTION NAME AND PARAMETERS,
// ONLY YOU HAVE TO WRITE THIS FUNCTION BODY, AND USE IMPORTED.
export async function getCommunityPlatformPostsPostIdCommentsCommentId(props: {
  postId: string & tags.Format<"uuid">;
  commentId: string & tags.Format<"uuid">;
}): Promise<ICommunityPlatformComment> {
  // 1. Verify parent post exists and is not soft-deleted (404 if not found)
  await MyGlobal.prisma.community_platform_posts.findFirstOrThrow({
    where: {
      id: props.postId,
      deleted_at: null,
    },
  });
  // 2. Find the comment by commentId, verify it belongs to postId and is not deleted
  const record =
    await MyGlobal.prisma.community_platform_comments.findFirstOrThrow({
      ...CommunityPlatformCommentTransformer.select(),
      where: {
        id: props.commentId,
        deleted_at: null,
        community_platform_post_id: props.postId,
      },
    });
  // 3. Transform to response DTO (includes recursive child replies via transformer cache)
  return await CommunityPlatformCommentTransformer.transform(record);
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
// import { ICommunityPlatformComment } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformComment";
// import { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";
// 
// // DON'T CHANGE FUNCTION NAME AND PARAMETERS,
// // ONLY YOU HAVE TO WRITE THIS FUNCTION BODY, AND USE IMPORTED.
// export async function getCommunityPlatformPostsPostIdCommentsCommentId(props: {
//   postId: string & tags.Format<"uuid">;
//   commentId: string & tags.Format<"uuid">;
// }): Promise<ICommunityPlatformComment> {
//   const record = await MyGlobal.prisma.community_platform_comments.findFirstOrThrow({
//     ...CommunityPlatformCommentTransformer.select(),
//     where: { ... },
//   });
//   return await CommunityPlatformCommentTransformer.transform(record);
// }
// ```
//--------------------------------------------------------------