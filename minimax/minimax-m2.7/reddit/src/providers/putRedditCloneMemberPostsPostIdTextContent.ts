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

export async function putRedditCloneMemberPostsPostIdTextContent(props: {
  member: MemberPayload;
  postId: string & tags.Format<"uuid">;
  body: IRedditClonePostTextContent.IUpdate;
}): Promise<IRedditClonePost> {
  const post = await MyGlobal.prisma.reddit_clone_posts.findUnique({
    where: { id: props.postId },
    select: {
      id: true,
      reddit_clone_member_id: true,
      type: true,
      deleted_at: true,
    },
  });
  if (!post || post.deleted_at !== null) {
    throw new HttpException("Post not found", 404);
  }
  if (post.reddit_clone_member_id !== props.member.id) {
    throw new HttpException("Forbidden", 403);
  }
  if (post.type !== "text") {
    throw new HttpException("Post is not a text type", 400);
  }
  await MyGlobal.prisma.$transaction([
    MyGlobal.prisma.reddit_clone_post_text_contents.updateMany({
      where: { reddit_clone_post_id: props.postId },
      data: {
        ...(props.body.body !== undefined && { body: props.body.body }),
      },
    }),
    MyGlobal.prisma.reddit_clone_posts.update({
      where: { id: props.postId },
      data: {
        updated_at: new Date(),
      },
    }),
  ]);
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
// import { IRedditClonePostTextContent } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditClonePostTextContent";
// import { IRedditClonePost } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditClonePost";
// import { IRedditCloneMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneMember";
// import { IRedditCloneCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneCommunity";
// import { IRedditClonePostLink } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditClonePostLink";
// import { IRedditClonePostImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditClonePostImage";
// import { IRedditCloneFile } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneFile";
// import { IRedditCloneFileThumbnail } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneFileThumbnail";
// import { IRedditCloneFileScan } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneFileScan";
// import { IRedditCloneFileAssociation } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneFileAssociation";
// 
// // DON'T CHANGE FUNCTION NAME AND PARAMETERS,
// // ONLY YOU HAVE TO WRITE THIS FUNCTION BODY, AND USE IMPORTED.
// export async function putRedditCloneMemberPostsPostIdTextContent(props: {
//   member: MemberPayload;
//   postId: string & tags.Format<"uuid">;
//   body: IRedditClonePostTextContent.IUpdate;
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