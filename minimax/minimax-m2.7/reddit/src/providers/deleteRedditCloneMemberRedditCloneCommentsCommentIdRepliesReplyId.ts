import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { MemberPayload } from "../decorators/payload/MemberPayload";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function deleteRedditCloneMemberRedditCloneCommentsCommentIdRepliesReplyId(props: {
  member: MemberPayload;
  commentId: string & tags.Format<"uuid">;
  replyId: string & tags.Format<"uuid">;
}): Promise<void> {
  // Find the reply by replyId - throws 404 if not found
  const reply = await MyGlobal.prisma.reddit_clone_comments.findUniqueOrThrow({
    where: { id: props.replyId },
    select: {
      id: true,
      parent_comment_id: true,
      reddit_clone_member_id: true,
      deleted_at: true,
    },
  });
  // Verify reply belongs to the specified parent comment
  if (reply.parent_comment_id !== props.commentId) {
    throw new HttpException("Not Found", 404);
  }
  // Verify the authenticated user is the author of the reply
  if (reply.reddit_clone_member_id !== props.member.id) {
    throw new HttpException("Forbidden", 403);
  }
  // Idempotent: if already deleted, return success
  if (reply.deleted_at !== null) {
    return;
  }
  // Soft-delete: set deleted_at timestamp
  await MyGlobal.prisma.reddit_clone_comments.update({
    where: { id: props.replyId },
    data: {
      deleted_at: new Date(),
    },
  });
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
// 
// // DON'T CHANGE FUNCTION NAME AND PARAMETERS,
// // ONLY YOU HAVE TO WRITE THIS FUNCTION BODY, AND USE IMPORTED.
// export async function deleteRedditCloneMemberRedditCloneCommentsCommentIdRepliesReplyId(props: {
//   member: MemberPayload;
//   commentId: string & tags.Format<"uuid">;
//   replyId: string & tags.Format<"uuid">;
// }): Promise<void> {
//   await MyGlobal.prisma.....delete({
//     where: { ... },
//   });
// }
// ```
//--------------------------------------------------------------