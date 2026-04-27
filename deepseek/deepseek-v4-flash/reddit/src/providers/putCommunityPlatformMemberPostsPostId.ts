import { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";
import { ICommunityPlatformPost } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPost";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { MemberPayload } from "../decorators/payload/MemberPayload";
import { CommunityPlatformPostTransformer } from "../transformers/CommunityPlatformPostTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function putCommunityPlatformMemberPostsPostId(props: {
  member: MemberPayload;
  postId: string & tags.Format<"uuid">;
  body: ICommunityPlatformPost.IUpdate;
}): Promise<ICommunityPlatformPost> {
  // 1. Look up the post — findUniqueOrThrow throws 404 if not found
  const post = await MyGlobal.prisma.community_platform_posts.findUniqueOrThrow(
    {
      where: { id: props.postId },
      select: {
        id: true,
        type: true,
        member_id: true,
        deleted_at: true,
      },
    },
  );
  // 2. Soft-deleted post → 404
  if (post.deleted_at) {
    throw new HttpException("Not Found", 404);
  }
  // 3. Verify the authenticated member is the post author
  if (post.member_id !== props.member.id) {
    throw new HttpException("Forbidden", 403);
  }
  // 4. Validate title is non-empty if provided
  if (props.body.title !== undefined && props.body.title.trim().length === 0) {
    throw new HttpException("Title cannot be empty", 400);
  }
  // 5. Generate current timestamp as ISO string
  const now = new Date().toISOString();
  // 6. Update the post record (title if provided, always update updated_at)
  await MyGlobal.prisma.community_platform_posts.update({
    where: { id: props.postId },
    data: {
      ...(props.body.title !== undefined && { title: props.body.title }),
      updated_at: now,
    },
  });
  // 7. Update type-specific content based on immutable post type
  if (post.type === "text" && props.body.body !== undefined) {
    await MyGlobal.prisma.community_platform_post_texts.upsert({
      where: { community_platform_post_id: props.postId },
      create: {
        id: v4(),
        community_platform_post_id: props.postId,
        body: props.body.body,
        created_at: now,
        updated_at: now,
      },
      update: {
        body: props.body.body,
        updated_at: now,
      },
    });
  }
  if (post.type === "link" && props.body.url !== undefined) {
    // Extract domain name from URL
    const urlObj = new URL(props.body.url);
    const domainName = urlObj.hostname.startsWith("www.")
      ? urlObj.hostname.slice(4)
      : urlObj.hostname;
    await MyGlobal.prisma.community_platform_post_links.upsert({
      where: { community_platform_post_id: props.postId },
      create: {
        id: v4(),
        community_platform_post_id: props.postId,
        url: props.body.url,
        domain_name: domainName,
        created_at: now,
        updated_at: now,
      },
      update: {
        url: props.body.url,
        domain_name: domainName,
        updated_at: now,
      },
    });
  }
  if (post.type === "image" && props.body.imageUrl !== undefined) {
    await MyGlobal.prisma.community_platform_post_images.upsert({
      where: { community_platform_post_id: props.postId },
      create: {
        id: v4(),
        community_platform_post_id: props.postId,
        url: props.body.imageUrl,
        created_at: now,
        updated_at: now,
      },
      update: {
        url: props.body.imageUrl,
        updated_at: now,
      },
    });
  }
  // 8. Return the updated post with full relations using the Transformer
  const updated =
    await MyGlobal.prisma.community_platform_posts.findUniqueOrThrow({
      where: { id: props.postId },
      ...CommunityPlatformPostTransformer.select(),
    });
  return await CommunityPlatformPostTransformer.transform(updated);
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
// import { ICommunityPlatformPost } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPost";
// import { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";
// import { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
// 
// // DON'T CHANGE FUNCTION NAME AND PARAMETERS,
// // ONLY YOU HAVE TO WRITE THIS FUNCTION BODY, AND USE IMPORTED.
// export async function putCommunityPlatformMemberPostsPostId(props: {
//   member: MemberPayload;
//   postId: string & tags.Format<"uuid">;
//   body: ICommunityPlatformPost.IUpdate;
// }): Promise<ICommunityPlatformPost> {
//   await MyGlobal.prisma.community_platform_posts.update({
//     where: { ... },
//     data: { ... },
//   });
//   const updated = await MyGlobal.prisma.community_platform_posts.findUniqueOrThrow({
//     where: { ... },
//     ...CommunityPlatformPostTransformer.select(),
//   });
//   return await CommunityPlatformPostTransformer.transform(updated);
// }
// ```
//--------------------------------------------------------------