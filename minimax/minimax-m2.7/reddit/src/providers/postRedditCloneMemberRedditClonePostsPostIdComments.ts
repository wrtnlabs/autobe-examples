import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IRedditCloneComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneComment";
import { IRedditCloneCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneCommunity";
import { IRedditCloneMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneMember";
import { IRedditClonePost } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditClonePost";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { RedditCloneCommentCollector } from "../collectors/RedditCloneCommentCollector";
import { MemberPayload } from "../decorators/payload/MemberPayload";
import { RedditCloneCommentTransformer } from "../transformers/RedditCloneCommentTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function postRedditCloneMemberRedditClonePostsPostIdComments(props: {
  member: MemberPayload;
  postId: string & tags.Format<"uuid">;
  body: IRedditCloneComment.ICreate;
}): Promise<IRedditCloneComment> {
  // Validate post exists and is not deleted
  const post = await MyGlobal.prisma.reddit_clone_posts.findUniqueOrThrow({
    where: { id: props.postId },
    select: { id: true, deleted_at: true },
  });
  if (post.deleted_at !== null) {
    throw new HttpException("Post not found", 404);
  }
  // If parentCommentId provided, validate parent comment belongs to same post
  if (
    props.body.parentCommentId !== undefined &&
    props.body.parentCommentId !== null
  ) {
    const parentComment =
      await MyGlobal.prisma.reddit_clone_comments.findUniqueOrThrow({
        where: { id: props.body.parentCommentId },
        select: { id: true, reddit_clone_post_id: true, deleted_at: true },
      });
    if (parentComment.deleted_at !== null) {
      throw new HttpException("Parent comment not found", 404);
    }
    if (parentComment.reddit_clone_post_id !== props.postId) {
      throw new HttpException(
        "Parent comment does not belong to this post",
        400,
      );
    }
  }
  // Create the comment with transformer select for proper typing
  const record = await MyGlobal.prisma.reddit_clone_comments.create({
    data: await RedditCloneCommentCollector.collect({
      body: props.body,
      redditClonePosts: { id: props.postId },
      redditCloneMembers: { id: props.member.id },
      redditCloneMemberSessions: { id: props.member.session_id },
    }),
    ...RedditCloneCommentTransformer.select(),
  });
  return await RedditCloneCommentTransformer.transform(record);
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
// import { IRedditCloneComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneComment";
// import { IRedditClonePost } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditClonePost";
// import { IRedditCloneMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneMember";
// import { IRedditCloneCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneCommunity";
// 
// // DON'T CHANGE FUNCTION NAME AND PARAMETERS,
// // ONLY YOU HAVE TO WRITE THIS FUNCTION BODY, AND USE IMPORTED.
// export async function postRedditCloneMemberRedditClonePostsPostIdComments(props: {
//   member: MemberPayload;
//   postId: string & tags.Format<"uuid">;
//   body: IRedditCloneComment.ICreate;
// }): Promise<IRedditCloneComment> {
//   const record = await MyGlobal.prisma.reddit_clone_comments.create({
//     data: await RedditCloneCommentCollector.collect({
//       body: props.body,
//       ...
//     }),
//     ...RedditCloneCommentTransformer.select(),
//   });
//   return await RedditCloneCommentTransformer.transform(record);
// }
// ```
//--------------------------------------------------------------