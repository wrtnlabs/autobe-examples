import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IRedditCloneCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneCommunity";
import { IRedditCloneFile } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneFile";
import { IRedditCloneFileAssociation } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneFileAssociation";
import { IRedditCloneFileScan } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneFileScan";
import { IRedditCloneFileThumbnail } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneFileThumbnail";
import { IRedditCloneMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneMember";
import { IRedditClonePost } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditClonePost";
import { IRedditClonePostImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditClonePostImage";
import { IRedditClonePostLink } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditClonePostLink";
import { IRedditClonePostTextContent } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditClonePostTextContent";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { MemberPayload } from "../decorators/payload/MemberPayload";
import { RedditClonePostTransformer } from "../transformers/RedditClonePostTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function putRedditCloneMemberPostsPostId(props: {
  member: MemberPayload;
  postId: string & tags.Format<"uuid">;
  body: IRedditClonePost.IUpdate;
}): Promise<IRedditClonePost> {
  const post = await MyGlobal.prisma.reddit_clone_posts.findUniqueOrThrow({
    where: { id: props.postId },
    select: {
      id: true,
      reddit_clone_member_id: true,
      deleted_at: true,
      type: true,
    },
  });
  if (post.deleted_at !== null) {
    throw new HttpException("Post not found", 404);
  }
  if (post.reddit_clone_member_id !== props.member.id) {
    throw new HttpException("Forbidden", 403);
  }
  await MyGlobal.prisma.reddit_clone_posts.update({
    where: { id: props.postId },
    data: {
      title: props.body.title,
      updated_at: new Date(),
    },
  });
  if (props.body.content !== undefined) {
    if ("body" in props.body.content) {
      const bodyValue = props.body.content.body;
      await MyGlobal.prisma.reddit_clone_post_text_contents.upsert({
        where: { reddit_clone_post_id: props.postId },
        create: {
          id: v4() as string & tags.Format<"uuid">,
          reddit_clone_post_id: props.postId,
          body: bodyValue ?? "",
        },
        update: {
          body: bodyValue,
        },
      });
    } else if ("url" in props.body.content) {
      const urlValue = props.body.content.url;
      await MyGlobal.prisma.reddit_clone_post_links.upsert({
        where: { reddit_clone_post_id: props.postId },
        create: {
          id: v4() as string & tags.Format<"uuid">,
          reddit_clone_post_id: props.postId,
          url: urlValue ?? "",
          created_at: new Date(),
          updated_at: new Date(),
        },
        update: {
          url: urlValue,
          updated_at: new Date(),
        },
      });
    } else if ("redditCloneFileId" in props.body.content) {
      await MyGlobal.prisma.reddit_clone_post_images.upsert({
        where: { reddit_clone_post_id: props.postId },
        create: {
          id: v4() as string & tags.Format<"uuid">,
          reddit_clone_post_id: props.postId,
          reddit_clone_file_id: props.body.content.redditCloneFileId,
          created_at: new Date(),
          updated_at: new Date(),
        },
        update: {
          reddit_clone_file_id: props.body.content.redditCloneFileId,
          updated_at: new Date(),
        },
      });
    }
  }
  const updated = await MyGlobal.prisma.reddit_clone_posts.findUniqueOrThrow({
    where: { id: props.postId },
    ...RedditClonePostTransformer.select(),
  });
  return await RedditClonePostTransformer.transform(updated);
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
// import { IRedditClonePost } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditClonePost";
// import { IRedditClonePostTextContent } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditClonePostTextContent";
// import { IRedditClonePostLink } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditClonePostLink";
// import { IRedditClonePostImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditClonePostImage";
// import { IRedditCloneMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneMember";
// import { IRedditCloneCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneCommunity";
// import { IRedditCloneFile } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneFile";
// import { IRedditCloneFileThumbnail } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneFileThumbnail";
// import { IRedditCloneFileScan } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneFileScan";
// import { IRedditCloneFileAssociation } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneFileAssociation";
// 
// // DON'T CHANGE FUNCTION NAME AND PARAMETERS,
// // ONLY YOU HAVE TO WRITE THIS FUNCTION BODY, AND USE IMPORTED.
// export async function putRedditCloneMemberPostsPostId(props: {
//   member: MemberPayload;
//   postId: string & tags.Format<"uuid">;
//   body: IRedditClonePost.IUpdate;
// }): Promise<IRedditClonePost> {
//   await MyGlobal.prisma.reddit_clone_posts.update({
//     where: { ... },
//     data: { ... },
//   });
//   const updated = await MyGlobal.prisma.reddit_clone_posts.findUniqueOrThrow({
//     where: { ... },
//     ...RedditClonePostTransformer.select(),
//   });
//   return await RedditClonePostTransformer.transform(updated);
// }
// ```
//--------------------------------------------------------------