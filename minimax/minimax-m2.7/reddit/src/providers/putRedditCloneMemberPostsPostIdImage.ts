import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IRedditCloneFile } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneFile";
import { IRedditCloneFileAssociation } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneFileAssociation";
import { IRedditCloneFileScan } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneFileScan";
import { IRedditCloneFileThumbnail } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneFileThumbnail";
import { IRedditCloneMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneMember";
import { IRedditClonePostImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditClonePostImage";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { MemberPayload } from "../decorators/payload/MemberPayload";
import { RedditClonePostImageTransformer } from "../transformers/RedditClonePostImageTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function putRedditCloneMemberPostsPostIdImage(props: {
  member: MemberPayload;
  postId: string & tags.Format<"uuid">;
  body: IRedditClonePostImage.IUpdate;
}): Promise<IRedditClonePostImage> {
  // 1. Validate post exists and belongs to the requesting member
  const post = await MyGlobal.prisma.reddit_clone_posts.findUniqueOrThrow({
    where: { id: props.postId },
    select: {
      id: true,
      reddit_clone_member_id: true,
      type: true,
      deleted_at: true,
    },
  });
  // 2. Validate ownership — user must be the post author
  if (post.reddit_clone_member_id !== props.member.id) {
    throw new HttpException("Forbidden", 403);
  }
  // 3. Validate post type is 'image' — only image posts have an image to replace
  if (post.type !== "image") {
    throw new HttpException("Post is not an image post", 400);
  }
  // 4. Validate new file exists, is processed, and is owned by the member
  const file = await MyGlobal.prisma.reddit_clone_files.findUnique({
    where: { id: props.body.redditCloneFileId },
    select: {
      id: true,
      uploader_id: true,
      status: true,
      deleted_at: true,
    },
  });
  if (!file || file.deleted_at !== null) {
    throw new HttpException("File not found", 400);
  }
  if (file.status !== "processed") {
    throw new HttpException("File is not in processed status", 400);
  }
  if (file.uploader_id !== props.member.id) {
    throw new HttpException("You do not own this file", 400);
  }
  // 5. Pre-generate values needed inside the transaction scope
  const newPostImageId = v4() as string & tags.Format<"uuid">;
  const now = new Date();
  // 6. Atomic transaction: replace the image association
  await MyGlobal.prisma.$transaction(async (tx) => {
    // Remove existing post-image link (if any)
    await tx.reddit_clone_post_images.deleteMany({
      where: { reddit_clone_post_id: props.postId },
    });
    // Insert the new post-image link
    await tx.reddit_clone_post_images.create({
      data: {
        id: newPostImageId,
        reddit_clone_post_id: props.postId,
        reddit_clone_file_id: props.body.redditCloneFileId,
        created_at: now,
        updated_at: now,
      },
    });
    // Touch the parent post's updated_at
    await tx.reddit_clone_posts.update({
      where: { id: props.postId },
      data: { updated_at: now },
    });
  });
  // 7. Fetch and return the updated post image with file details
  const updated =
    await MyGlobal.prisma.reddit_clone_post_images.findUniqueOrThrow({
      where: { reddit_clone_post_id: props.postId },
      ...RedditClonePostImageTransformer.select(),
    });
  return await RedditClonePostImageTransformer.transform(updated);
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
// import { IRedditClonePostImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditClonePostImage";
// import { IRedditCloneFile } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneFile";
// import { IRedditCloneMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneMember";
// import { IRedditCloneFileThumbnail } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneFileThumbnail";
// import { IRedditCloneFileScan } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneFileScan";
// import { IRedditCloneFileAssociation } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneFileAssociation";
// 
// // DON'T CHANGE FUNCTION NAME AND PARAMETERS,
// // ONLY YOU HAVE TO WRITE THIS FUNCTION BODY, AND USE IMPORTED.
// export async function putRedditCloneMemberPostsPostIdImage(props: {
//   member: MemberPayload;
//   postId: string & tags.Format<"uuid">;
//   body: IRedditClonePostImage.IUpdate;
// }): Promise<IRedditClonePostImage> {
//   await MyGlobal.prisma.reddit_clone_post_images.update({
//     where: { ... },
//     data: { ... },
//   });
//   const updated = await MyGlobal.prisma.reddit_clone_post_images.findUniqueOrThrow({
//     where: { ... },
//     ...RedditClonePostImageTransformer.select(),
//   });
//   return await RedditClonePostImageTransformer.transform(updated);
// }
// ```
//--------------------------------------------------------------