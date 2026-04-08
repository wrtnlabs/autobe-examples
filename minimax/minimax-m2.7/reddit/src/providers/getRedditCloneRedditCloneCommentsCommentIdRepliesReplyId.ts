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
import { RedditCloneCommentTransformer } from "../transformers/RedditCloneCommentTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function getRedditCloneRedditCloneCommentsCommentIdRepliesReplyId(props: {
  commentId: string & tags.Format<"uuid">;
  replyId: string & tags.Format<"uuid">;
}): Promise<IRedditCloneComment> {
  // Verify parent comment exists and belongs to a valid post
  await MyGlobal.prisma.reddit_clone_comments.findUniqueOrThrow({
    where: { id: props.commentId },
  });
  // Query reply ensuring it belongs to the specified parent comment
  const reply = await MyGlobal.prisma.reddit_clone_comments.findFirstOrThrow({
    where: {
      id: props.replyId,
      parent_comment_id: props.commentId,
    },
    ...RedditCloneCommentTransformer.select(),
  });
  // Apply soft-delete visibility: show placeholder for deleted content
  if (reply.deleted_at !== null) {
    reply.content = "[deleted]";
  }
  return await RedditCloneCommentTransformer.transform(reply);
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
// export async function getRedditCloneRedditCloneCommentsCommentIdRepliesReplyId(props: {
//   commentId: string & tags.Format<"uuid">;
//   replyId: string & tags.Format<"uuid">;
// }): Promise<IRedditCloneComment> {
//   const record = await MyGlobal.prisma.reddit_clone_comments.findFirstOrThrow({
//     ...RedditCloneCommentTransformer.select(),
//     where: { ... },
//   });
//   return await RedditCloneCommentTransformer.transform(record);
// }
// ```
//--------------------------------------------------------------