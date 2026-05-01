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
import { CommunityHubPostTransformer } from "../transformers/CommunityHubPostTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchCommunityHubPostsPostId(props: {
  postId: string & tags.Format<"uuid">;
  body: ICommunityHubPost.IUpdate;
}): Promise<ICommunityHubPost> {
  const existing = await MyGlobal.prisma.community_hub_posts.findUniqueOrThrow({
    where: { id: props.postId },
    select: {
      id: true,
      type: true,
      deleted_at: true,
    },
  });
  if (existing.deleted_at !== null) {
    throw new HttpException("Post no longer exists", 404);
  }
  const { body: update } = props;
  if (update.title !== undefined && update.title.trim().length === 0) {
    throw new HttpException("Title cannot be empty", 400);
  }
  if (existing.type === "text") {
    if (
      update.body !== undefined &&
      (update.body === null || update.body.trim().length === 0)
    ) {
      throw new HttpException("Content is required for text posts", 400);
    }
  } else if (existing.type === "link") {
    if (
      update.url !== undefined &&
      (update.url === null || update.url.trim().length === 0)
    ) {
      throw new HttpException("URL is required for link posts", 400);
    }
  } else if (existing.type === "image") {
    if (update.image !== undefined) {
      const now: string = new Date().toISOString();
      await MyGlobal.prisma.community_hub_post_images.updateMany({
        where: {
          community_hub_post_id: props.postId,
          deleted_at: null,
        },
        data: { deleted_at: now },
      });
      try {
        await MyGlobal.prisma.community_hub_post_images.create({
          data: {
            id: v4(),
            post: { connect: { id: props.postId } },
            original_path: "",
            thumbnail_path: "",
            byte_size: 0,
            width: 0,
            height: 0,
            mime_type: "",
            created_at: now,
            updated_at: now,
          },
        });
      } catch {
        throw new HttpException("Upload could not be completed", 500);
      }
    }
  }
  const now: string = new Date().toISOString();
  await MyGlobal.prisma.community_hub_posts.update({
    where: { id: props.postId },
    data: {
      updated_at: now,
      ...(update.title !== undefined && { title: update.title }),
      ...(existing.type === "text" &&
        update.body !== undefined && { body: update.body }),
      ...(existing.type === "link" &&
        update.url !== undefined && { url: update.url }),
    },
  });
  const updated = await MyGlobal.prisma.community_hub_posts.findUniqueOrThrow({
    where: { id: props.postId },
    ...CommunityHubPostTransformer.select(),
  });
  return await CommunityHubPostTransformer.transform(updated);
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
// import { ICommunityHubPost } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityHubPost";
// import { ICommunityHubPostImage } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityHubPostImage";
// import { ICommunityHubMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityHubMember";
// import { ICommunityHubCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityHubCommunity";
// 
// // DON'T CHANGE FUNCTION NAME AND PARAMETERS,
// // ONLY YOU HAVE TO WRITE THIS FUNCTION BODY, AND USE IMPORTED.
// export async function patchCommunityHubPostsPostId(props: {
//   postId: string & tags.Format<"uuid">;
//   body: ICommunityHubPost.IUpdate;
// }): Promise<ICommunityHubPost> {
//   const record = await MyGlobal.prisma.community_hub_posts.findFirstOrThrow({
//     ...CommunityHubPostTransformer.select(),
//     where: { ... },
//   });
//   return await CommunityHubPostTransformer.transform(record);
// }
// ```
//--------------------------------------------------------------