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

export async function postCommunityHubPostsPostIdImage(props: {
  postId: string & tags.Format<"uuid">;
  body: ICommunityHubPostImage.IUpload;
}): Promise<ICommunityHubPostImage> {
  const post = await MyGlobal.prisma.community_hub_posts.findFirstOrThrow({
    where: {
      id: props.postId,
      deleted_at: null,
    },
    select: {
      id: true,
      type: true,
    },
  });
  if (post.type !== "image") {
    throw new HttpException(
      "Images can only be uploaded to image-type posts",
      400,
    );
  }
  if (props.body.file.length === 0) {
    throw new HttpException("Uploaded file must not be empty", 400);
  }
  const imageUuid = v4();
  const originalPath = `/uploads/images/${props.postId}/${imageUuid}/original`;
  const thumbnailPath = `/uploads/images/${props.postId}/${imageUuid}/thumbnail`;
  const byteSize = props.body.file.length;
  await MyGlobal.prisma.community_hub_post_images.upsert({
    where: {
      community_hub_post_id: props.postId,
    },
    create: {
      id: imageUuid,
      post: { connect: { id: props.postId } },
      original_path: originalPath,
      thumbnail_path: thumbnailPath,
      byte_size: byteSize,
      width: 0,
      height: 0,
      mime_type: "image/jpeg",
      created_at: new Date(),
      updated_at: new Date(),
      deleted_at: null,
    },
    update: {
      original_path: originalPath,
      thumbnail_path: thumbnailPath,
      byte_size: byteSize,
      width: 0,
      height: 0,
      mime_type: "image/jpeg",
      updated_at: new Date(),
      deleted_at: null,
    },
  });
  const record =
    await MyGlobal.prisma.community_hub_post_images.findUniqueOrThrow({
      where: {
        community_hub_post_id: props.postId,
      },
      ...CommunityHubPostImageTransformer.select(),
    });
  return await CommunityHubPostImageTransformer.transform(record);
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
// export async function postCommunityHubPostsPostIdImage(props: {
//   postId: string & tags.Format<"uuid">;
//   body: ICommunityHubPostImage.IUpload;
// }): Promise<ICommunityHubPostImage> {
//   const record = await MyGlobal.prisma.community_hub_post_images.findFirstOrThrow({
//     ...CommunityHubPostImageTransformer.select(),
//     where: { ... },
//   });
//   return await CommunityHubPostImageTransformer.transform(record);
// }
// ```
//--------------------------------------------------------------