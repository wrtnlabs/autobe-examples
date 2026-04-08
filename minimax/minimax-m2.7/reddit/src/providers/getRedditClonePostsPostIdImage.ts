import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IRedditCloneFile } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneFile";
import { IRedditCloneFileAssociation } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneFileAssociation";
import { IRedditCloneFileScan } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneFileScan";
import { IRedditCloneFileThumbnail } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneFileThumbnail";
import { IRedditCloneMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneMember";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { RedditCloneFileTransformer } from "../transformers/RedditCloneFileTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function getRedditClonePostsPostIdImage(props: {
  postId: string & tags.Format<"uuid">;
}): Promise<IRedditCloneFile> {
  // Step 1: Verify the post exists
  const post = await MyGlobal.prisma.reddit_clone_posts.findUniqueOrThrow({
    where: { id: props.postId },
    select: { id: true, type: true },
  });
  // Step 2: Verify this is an image post
  if (post.type !== "image") {
    throw new HttpException("Post is not an image post", 404);
  }
  // Step 3: Find the associated image record
  const postImage =
    await MyGlobal.prisma.reddit_clone_post_images.findUniqueOrThrow({
      where: { reddit_clone_post_id: props.postId },
      select: { id: true, reddit_clone_file_id: true },
    });
  // Step 4: Get the file metadata (with deleted_at check)
  const file = await MyGlobal.prisma.reddit_clone_files.findUniqueOrThrow({
    where: { id: postImage.reddit_clone_file_id },
    ...RedditCloneFileTransformer.select(),
  });
  // Step 5: Verify file is not deleted
  if (file.deleted_at !== null) {
    throw new HttpException("Image file not found", 404);
  }
  // Step 6: Return transformed response
  return await RedditCloneFileTransformer.transform(file);
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
// import { IRedditCloneFile } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneFile";
// import { IRedditCloneMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneMember";
// import { IRedditCloneFileThumbnail } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneFileThumbnail";
// import { IRedditCloneFileScan } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneFileScan";
// import { IRedditCloneFileAssociation } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneFileAssociation";
// 
// // DON'T CHANGE FUNCTION NAME AND PARAMETERS,
// // ONLY YOU HAVE TO WRITE THIS FUNCTION BODY, AND USE IMPORTED.
// export async function getRedditClonePostsPostIdImage(props: {
//   postId: string & tags.Format<"uuid">;
// }): Promise<IRedditCloneFile> {
//   const record = await MyGlobal.prisma.reddit_clone_files.findFirstOrThrow({
//     ...RedditCloneFileTransformer.select(),
//     where: { ... },
//   });
//   return await RedditCloneFileTransformer.transform(record);
// }
// ```
//--------------------------------------------------------------