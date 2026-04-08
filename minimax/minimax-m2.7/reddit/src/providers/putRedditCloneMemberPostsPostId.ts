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
  // 1. Fetch existing post and verify ownership
  const existingPost =
    await MyGlobal.prisma.reddit_clone_posts.findUniqueOrThrow({
      where: { id: props.postId, deleted_at: null },
      select: {
        id: true,
        reddit_clone_member_id: true,
        type: true,
      },
    });
  // 2. Verify the authenticated user is the author
  if (existingPost.reddit_clone_member_id !== props.member.id) {
    throw new HttpException("Forbidden", 403);
  }
  // 3. Update the post title and timestamp
  await MyGlobal.prisma.reddit_clone_posts.update({
    where: { id: props.postId },
    data: {
      title: props.body.title,
      updated_at: new Date(),
    },
  });
  // 4. Update type-specific content based on post type
  if (existingPost.type === "text") {
    const contentUpdate = props.body
      .content as IRedditClonePostTextContent.IUpdate;
    if (contentUpdate.body !== undefined) {
      await MyGlobal.prisma.reddit_clone_post_text_contents.upsert({
        where: { reddit_clone_post_id: props.postId },
        update: { body: contentUpdate.body },
        create: {
          id: v4(),
          reddit_clone_post_id: props.postId,
          body: contentUpdate.body,
        },
      });
    }
  } else if (existingPost.type === "link") {
    const contentUpdate = props.body.content as IRedditClonePostLink.IUpdate;
    if (contentUpdate.url !== undefined) {
      await MyGlobal.prisma.reddit_clone_post_links.upsert({
        where: { reddit_clone_post_id: props.postId },
        update: { url: contentUpdate.url, updated_at: new Date() },
        create: {
          id: v4(),
          reddit_clone_post_id: props.postId,
          url: contentUpdate.url,
          created_at: new Date(),
          updated_at: new Date(),
        },
      });
    }
  } else if (existingPost.type === "image") {
    const contentUpdate = props.body.content as IRedditClonePostImage.IUpdate;
    // Verify the file exists and is an image
    const file = await MyGlobal.prisma.reddit_clone_files.findUniqueOrThrow({
      where: { id: contentUpdate.redditCloneFileId },
      select: { id: true, mime_type: true },
    });
    if (!file.mime_type.startsWith("image/")) {
      throw new HttpException("File must be an image", 400);
    }
    await MyGlobal.prisma.reddit_clone_post_images.upsert({
      where: { reddit_clone_post_id: props.postId },
      update: {
        reddit_clone_file_id: contentUpdate.redditCloneFileId,
        updated_at: new Date(),
      },
      create: {
        id: v4(),
        reddit_clone_post_id: props.postId,
        reddit_clone_file_id: contentUpdate.redditCloneFileId,
        created_at: new Date(),
        updated_at: new Date(),
      },
    });
  }
  // 5. Fetch updated post with all relations using correct select
  const updatedPost =
    await MyGlobal.prisma.reddit_clone_posts.findUniqueOrThrow({
      where: { id: props.postId },
      select: {
        id: true,
        title: true,
        type: true,
        vote_score: true,
        comment_count: true,
        created_at: true,
        updated_at: true,
        deleted_at: true,
        author: {
          select: {
            id: true,
            username: true,
          },
        },
        community: {
          select: {
            id: true,
            name: true,
            description: true,
            subscriber_count: true,
            icon: {
              select: {
                file: {
                  select: {
                    storage_path: true,
                  },
                },
              },
            },
          },
        },
        postTextContent: {
          select: {
            body: true,
          },
        },
        link: {
          select: {
            url: true,
          },
        },
        image: {
          select: {
            reddit_clone_file_id: true,
          },
        },
      },
    });
  // 6. Transform and return
  return await RedditClonePostTransformer.transform(
    updatedPost as Parameters<typeof RedditClonePostTransformer.transform>[0],
  );
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