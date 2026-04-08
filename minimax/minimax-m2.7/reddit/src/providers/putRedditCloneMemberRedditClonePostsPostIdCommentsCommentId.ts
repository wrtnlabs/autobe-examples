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
import { MemberPayload } from "../decorators/payload/MemberPayload";
import { RedditCloneCommentTransformer } from "../transformers/RedditCloneCommentTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function putRedditCloneMemberRedditClonePostsPostIdCommentsCommentId(props: {
  member: MemberPayload;
  postId: string & tags.Format<"uuid">;
  commentId: string & tags.Format<"uuid">;
  body: IRedditCloneComment.IUpdate;
}): Promise<IRedditCloneComment> {
  // Find the comment to validate ownership and existence
  const comment = await MyGlobal.prisma.reddit_clone_comments.findUniqueOrThrow(
    {
      where: { id: props.commentId },
      select: {
        id: true,
        reddit_clone_member_id: true,
        reddit_clone_post_id: true,
        deleted_at: true,
      },
    },
  );
  // Verify comment belongs to the specified post
  if (comment.reddit_clone_post_id !== props.postId) {
    throw new HttpException("Comment not found in this post", 404);
  }
  // Check if comment is soft-deleted
  if (comment.deleted_at !== null) {
    throw new HttpException("Cannot update a deleted comment", 400);
  }
  // Validate that the authenticated user is the author
  if (comment.reddit_clone_member_id !== props.member.id) {
    throw new HttpException("You can only edit your own comments", 403);
  }
  // Update the comment with new content and updated timestamp
  await MyGlobal.prisma.reddit_clone_comments.update({
    where: { id: props.commentId },
    data: {
      content: props.body.content,
      updated_at: new Date(),
    },
  });
  // Fetch the updated comment with all related data using transformer
  const updated = await MyGlobal.prisma.reddit_clone_comments.findUniqueOrThrow(
    {
      where: { id: props.commentId },
      ...RedditCloneCommentTransformer.select(),
    },
  );
  return await RedditCloneCommentTransformer.transform(updated);
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
// export async function putRedditCloneMemberRedditClonePostsPostIdCommentsCommentId(props: {
//   member: MemberPayload;
//   postId: string & tags.Format<"uuid">;
//   commentId: string & tags.Format<"uuid">;
//   body: IRedditCloneComment.IUpdate;
// }): Promise<IRedditCloneComment> {
//   await MyGlobal.prisma.reddit_clone_comments.update({
//     where: { ... },
//     data: { ... },
//   });
//   const updated = await MyGlobal.prisma.reddit_clone_comments.findUniqueOrThrow({
//     where: { ... },
//     ...RedditCloneCommentTransformer.select(),
//   });
//   return await RedditCloneCommentTransformer.transform(updated);
// }
// ```
//--------------------------------------------------------------