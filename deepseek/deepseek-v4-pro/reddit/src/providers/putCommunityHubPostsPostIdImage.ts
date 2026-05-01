import { ICommunityHubCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityHubCommunity";
import { ICommunityHubMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityHubMember";
import { ICommunityHubPost } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityHubPost";
import { ICommunityHubPostImage } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityHubPostImage";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { CommunityHubPostImageTransformer } from "../transformers/CommunityHubPostImageTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function putCommunityHubPostsPostIdImage(props: {
  postId: string & tags.Format<"uuid">;
  body: ICommunityHubPostImage.IUpdate;
}): Promise<ICommunityHubPostImage> {
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
  if (post.type !== "image") {
    throw new HttpException(
      "Only image-type posts support image replacement",
      400,
    );
  }
  const imageUri: string = props.body.image_uri;
  const extensionMatch: RegExpMatchArray | null = imageUri.match(
    /\.([a-zA-Z0-9]+)(?:\?.*)?$/,
  );
  const fileExtension: string =
    extensionMatch !== null ? extensionMatch[1].toLowerCase() : "jpg";
  const mimeTypeByExtension: Record<string, string> = {
    jpg: "image/jpeg",
    jpeg: "image/jpeg",
    png: "image/png",
    webp: "image/webp",
  };
  const mimeType: string = mimeTypeByExtension[fileExtension] ?? "image/jpeg";
  const storagePrefix: string = `images/${props.postId}`;
  const timestampSuffix: string = new Date()
    .toISOString()
    .replace(/[:.]/g, "-");
  const newOriginalPath: string = `${storagePrefix}/original_${timestampSuffix}.${fileExtension}`;
  const newThumbnailPath: string = `${storagePrefix}/thumbnail_${timestampSuffix}.${fileExtension}`;
  const existingImage =
    await MyGlobal.prisma.community_hub_post_images.findUnique({
      where: { community_hub_post_id: props.postId },
      select: { id: true, original_path: true, thumbnail_path: true },
    });
  const now: string = new Date().toISOString();
  await MyGlobal.prisma.community_hub_post_images.update({
    where: { community_hub_post_id: props.postId },
    data: {
      original_path: newOriginalPath,
      thumbnail_path: newThumbnailPath,
      byte_size: 0,
      width: 0,
      height: 0,
      mime_type: mimeType,
      updated_at: now,
      deleted_at: null,
    },
  });
  await MyGlobal.prisma.community_hub_posts.update({
    where: { id: props.postId },
    data: { updated_at: now },
  });
  const updated =
    await MyGlobal.prisma.community_hub_post_images.findUniqueOrThrow({
      where: { community_hub_post_id: props.postId },
      ...CommunityHubPostImageTransformer.select(),
    });
  return await CommunityHubPostImageTransformer.transform(updated);
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
// import { ICommunityHubPostImage } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityHubPostImage";
// import { ICommunityHubPost } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityHubPost";
// import { ICommunityHubMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityHubMember";
// import { ICommunityHubCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityHubCommunity";
// 
// // DON'T CHANGE FUNCTION NAME AND PARAMETERS,
// // ONLY YOU HAVE TO WRITE THIS FUNCTION BODY, AND USE IMPORTED.
// export async function putCommunityHubPostsPostIdImage(props: {
//   postId: string & tags.Format<"uuid">;
//   body: ICommunityHubPostImage.IUpdate;
// }): Promise<ICommunityHubPostImage> {
//   await MyGlobal.prisma.community_hub_post_images.update({
//     where: { ... },
//     data: { ... },
//   });
//   const updated = await MyGlobal.prisma.community_hub_post_images.findUniqueOrThrow({
//     where: { ... },
//     ...CommunityHubPostImageTransformer.select(),
//   });
//   return await CommunityHubPostImageTransformer.transform(updated);
// }
// ```
//--------------------------------------------------------------