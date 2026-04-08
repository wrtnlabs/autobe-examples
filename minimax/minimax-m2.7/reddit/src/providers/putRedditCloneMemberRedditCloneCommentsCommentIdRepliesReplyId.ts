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

export async function putRedditCloneMemberRedditCloneCommentsCommentIdRepliesReplyId(props: {
  member: MemberPayload;
  commentId: string & tags.Format<"uuid">;
  replyId: string & tags.Format<"uuid">;
  body: IRedditCloneComment.IUpdate;
}): Promise<IRedditCloneComment> {
  // 1. Find the reply and verify it exists (404 if not found)
  const reply = await MyGlobal.prisma.reddit_clone_comments.findUniqueOrThrow({
    where: { id: props.replyId },
    select: {
      id: true,
      reddit_clone_member_id: true,
      parent_comment_id: true,
      deleted_at: true,
    },
  });
  // 2. Verify reply is not soft-deleted
  if (reply.deleted_at !== null) {
    throw new HttpException("Cannot update a deleted reply", 400);
  }
  // 3. Verify reply belongs to the specified parent comment
  if (reply.parent_comment_id !== props.commentId) {
    throw new HttpException(
      "Reply does not belong to the specified comment",
      400,
    );
  }
  // 4. Verify the authenticated member is the author of the reply
  if (reply.reddit_clone_member_id !== props.member.id) {
    throw new HttpException("Forbidden", 403);
  }
  // 5. Update the reply content with ISO string timestamp
  await MyGlobal.prisma.reddit_clone_comments.update({
    where: { id: props.replyId },
    data: {
      content: props.body.content,
      updated_at: new Date(),
    },
  });
  // 6. Return the updated reply with author information using transformer
  const updated = await MyGlobal.prisma.reddit_clone_comments.findUniqueOrThrow(
    {
      where: { id: props.replyId },
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
// export async function putRedditCloneMemberRedditCloneCommentsCommentIdRepliesReplyId(props: {
//   member: MemberPayload;
//   commentId: string & tags.Format<"uuid">;
//   replyId: string & tags.Format<"uuid">;
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