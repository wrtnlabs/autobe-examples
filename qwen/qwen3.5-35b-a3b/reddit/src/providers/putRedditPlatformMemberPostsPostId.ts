import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IRedditPlatformComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformComment";
import { IRedditPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformCommunity";
import { IRedditPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformMember";
import { IRedditPlatformPost } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformPost";
import { IRedditPlatformPostImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformPostImage";
import { IRedditPlatformPostLink } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformPostLink";
import { IRedditPlatformPostText } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformPostText";
import { IRedditPlatformPostVote } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformPostVote";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { MemberPayload } from "../decorators/payload/MemberPayload";
import { RedditPlatformPostTransformer } from "../transformers/RedditPlatformPostTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function putRedditPlatformMemberPostsPostId(props: {
  member: MemberPayload;
  postId: string & tags.Format<"uuid">;
  body: IRedditPlatformPost.IUpdate;
}): Promise<IRedditPlatformPost> {
  const post = await MyGlobal.prisma.reddit_platform_posts.findUniqueOrThrow({
    where: {
      id: props.postId,
      deleted_at: null,
    },
    select: { id: true, author_id: true, post_type: true },
  });
  if (post.author_id !== props.member.id) {
    throw new HttpException("Forbidden", 403);
  }
  const currentPostType = post.post_type;
  const newPostType = props.body.post_type ?? currentPostType;
  const isPostTypeChange = newPostType !== currentPostType;
  if (isPostTypeChange) {
    const newPostTypeValue = props.body.post_type;
    if (newPostTypeValue === "text" && !props.body.text_content) {
      throw new HttpException("text_content is required for text posts", 400);
    }
    if (newPostTypeValue === "link" && !props.body.url) {
      throw new HttpException("url is required for link posts", 400);
    }
    if (newPostTypeValue === "image" && !props.body.image_url) {
      throw new HttpException("image_url is required for image posts", 400);
    }
  }
  const updateData: Prisma.reddit_platform_postsUpdateInput = {
    ...(props.body.title !== undefined && { title: props.body.title }),
    updated_at: new Date(),
    ...(isPostTypeChange && { post_type: newPostType }),
  };
  if (isPostTypeChange) {
    await MyGlobal.prisma.reddit_platform_post_texts.deleteMany({
      where: { reddit_platform_post_id: props.postId },
    });
    await MyGlobal.prisma.reddit_platform_post_links.deleteMany({
      where: { reddit_platform_post_id: props.postId },
    });
    await MyGlobal.prisma.reddit_platform_post_images.deleteMany({
      where: { reddit_platform_post_id: props.postId },
    });
  }
  if (newPostType === "text") {
    await MyGlobal.prisma.reddit_platform_post_texts.upsert({
      where: { reddit_platform_post_id: props.postId },
      create: {
        reddit_platform_post_id: props.postId,
        text_content: props.body.text_content ?? "",
        created_at: new Date(),
        updated_at: new Date(),
        deleted_at: null,
      } as unknown as Prisma.reddit_platform_post_textsCreateInput,
      update: {
        text_content: props.body.text_content ?? "",
        updated_at: new Date(),
      },
    });
  } else if (newPostType === "link") {
    await MyGlobal.prisma.reddit_platform_post_links.upsert({
      where: { reddit_platform_post_id: props.postId },
      create: {
        reddit_platform_post_id: props.postId,
        url: props.body.url ?? "",
        created_at: new Date(),
        updated_at: new Date(),
        deleted_at: null,
      } as unknown as Prisma.reddit_platform_post_linksCreateInput,
      update: {
        url: props.body.url ?? "",
        updated_at: new Date(),
      },
    });
  } else if (newPostType === "image") {
    await MyGlobal.prisma.reddit_platform_post_images.upsert({
      where: { reddit_platform_post_id: props.postId },
      create: {
        reddit_platform_post_id: props.postId,
        image_url: props.body.image_url ?? "",
        image_alt_text: props.body.image_alt_text ?? null,
        created_at: new Date(),
        updated_at: new Date(),
        deleted_at: null,
      } as unknown as Prisma.reddit_platform_post_imagesCreateInput,
      update: {
        image_url: props.body.image_url ?? "",
        image_alt_text: props.body.image_alt_text,
        updated_at: new Date(),
      },
    });
  }
  await MyGlobal.prisma.reddit_platform_posts.update({
    where: { id: props.postId },
    data: updateData,
  });
  const updated = await MyGlobal.prisma.reddit_platform_posts.findUniqueOrThrow(
    {
      where: { id: props.postId },
      ...RedditPlatformPostTransformer.select(),
    },
  );
  return await RedditPlatformPostTransformer.transform(updated);
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
// import { IRedditPlatformPost } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformPost";
// import { IRedditPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformMember";
// import { IRedditPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformCommunity";
// import { IRedditPlatformPostText } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformPostText";
// import { IRedditPlatformPostLink } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformPostLink";
// import { IRedditPlatformPostImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformPostImage";
// import { IRedditPlatformPostVote } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformPostVote";
// import { IRedditPlatformComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformComment";
// 
// // DON'T CHANGE FUNCTION NAME AND PARAMETERS,
// // ONLY YOU HAVE TO WRITE THIS FUNCTION BODY, AND USE IMPORTED.
// export async function putRedditPlatformMemberPostsPostId(props: {
//   member: MemberPayload;
//   postId: string & tags.Format<"uuid">;
//   body: IRedditPlatformPost.IUpdate;
// }): Promise<IRedditPlatformPost> {
//   await MyGlobal.prisma.reddit_platform_posts.update({
//     where: { ... },
//     data: { ... },
//   });
//   const updated = await MyGlobal.prisma.reddit_platform_posts.findUniqueOrThrow({
//     where: { ... },
//     ...RedditPlatformPostTransformer.select(),
//   });
//   return await RedditPlatformPostTransformer.transform(updated);
// }
// ```
//--------------------------------------------------------------