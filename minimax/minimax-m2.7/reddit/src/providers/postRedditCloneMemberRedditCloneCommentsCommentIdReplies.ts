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

export async function postRedditCloneMemberRedditCloneCommentsCommentIdReplies(props: {
  member: MemberPayload;
  commentId: string & tags.Format<"uuid">;
  body: IRedditCloneComment.ICreate;
}): Promise<IRedditCloneComment> {
  // Validate parent comment exists (404 if not found)
  const parentComment =
    await MyGlobal.prisma.reddit_clone_comments.findUniqueOrThrow({
      where: { id: props.commentId },
      select: {
        id: true,
        reddit_clone_post_id: true,
      },
    });
  // Create the reply comment
  const created = await MyGlobal.prisma.reddit_clone_comments.create({
    data: await RedditCloneCommentCollector.collect({
      body: props.body,
      redditClonePosts: {
        id: parentComment.reddit_clone_post_id,
      } satisfies IEntity,
      redditCloneMembers: { id: props.member.id } satisfies IEntity,
      redditCloneMemberSessions: {
        id: props.member.session_id,
      } satisfies IEntity,
    }),
    ...RedditCloneCommentTransformer.select(),
  });
  return await RedditCloneCommentTransformer.transform(created);
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
// export async function postRedditCloneMemberRedditCloneCommentsCommentIdReplies(props: {
//   member: MemberPayload;
//   commentId: string & tags.Format<"uuid">;
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