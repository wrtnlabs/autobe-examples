import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IRedditPlatformComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformComment";
import { IRedditPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformCommunity";
import { IRedditPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformMember";
import { IRedditPlatformPost } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformPost";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { MemberPayload } from "../decorators/payload/MemberPayload";
import { RedditPlatformCommentTransformer } from "../transformers/RedditPlatformCommentTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function putRedditPlatformMemberCommentsCommentId(props: {
  member: MemberPayload;
  commentId: string & tags.Format<"uuid">;
  body: IRedditPlatformComment.IUpdate;
}): Promise<IRedditPlatformComment> {
  // 1. Query comment with author for ownership check
  const comment =
    await MyGlobal.prisma.reddit_platform_comments.findUniqueOrThrow({
      where: { id: props.commentId },
      select: {
        id: true,
        reddit_platform_post_id: true,
        reddit_platform_member_id: true,
        reddit_platform_comments_id: true,
        deleted_at: true,
        author: { select: { id: true } },
        post: { select: { id: true, community_id: true } },
        parent: { select: { id: true, deleted_at: true } },
      },
    });
  // 2. Validate comment not deleted
  if (comment.deleted_at !== null) {
    throw new HttpException("Comment not found", 404);
  }
  // 3. Verify member is comment author
  if (comment.reddit_platform_member_id !== props.member.id) {
    throw new HttpException("Forbidden", 403);
  }
  // 4. If parent exists, verify it exists and is not deleted
  if (comment.reddit_platform_comments_id !== null) {
    const parent = await MyGlobal.prisma.reddit_platform_comments.findFirst({
      where: { id: comment.reddit_platform_comments_id },
      select: { id: true, deleted_at: true },
    });
    if (parent === null || parent.deleted_at !== null) {
      throw new HttpException("Forbidden", 403);
    }
  }
  // 5. Verify user is not banned from the community
  const ban = await MyGlobal.prisma.reddit_platform_banned_users.findFirst({
    where: {
      community_id: comment.post.community_id,
      user_id: props.member.id,
      deleted_at: null,
    },
  });
  if (ban !== null) {
    throw new HttpException("Forbidden", 403);
  }
  // 6. Update comment
  await MyGlobal.prisma.reddit_platform_comments.update({
    where: { id: props.commentId },
    data: {
      content: props.body.content,
      updated_at: new Date(),
    },
  });
  // 7. Fetch full updated comment with transformer
  const updated =
    await MyGlobal.prisma.reddit_platform_comments.findUniqueOrThrow({
      where: { id: props.commentId },
      ...RedditPlatformCommentTransformer.select(),
    });
  // 8. Return transformed comment
  return await RedditPlatformCommentTransformer.transform(updated);
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
// import { IRedditPlatformComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformComment";
// import { IRedditPlatformPost } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformPost";
// import { IRedditPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformMember";
// import { IRedditPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformCommunity";
// 
// // DON'T CHANGE FUNCTION NAME AND PARAMETERS,
// // ONLY YOU HAVE TO WRITE THIS FUNCTION BODY, AND USE IMPORTED.
// export async function putRedditPlatformMemberCommentsCommentId(props: {
//   member: MemberPayload;
//   commentId: string & tags.Format<"uuid">;
//   body: IRedditPlatformComment.IUpdate;
// }): Promise<IRedditPlatformComment> {
//   await MyGlobal.prisma.reddit_platform_comments.update({
//     where: { ... },
//     data: { ... },
//   });
//   const updated = await MyGlobal.prisma.reddit_platform_comments.findUniqueOrThrow({
//     where: { ... },
//     ...RedditPlatformCommentTransformer.select(),
//   });
//   return await RedditPlatformCommentTransformer.transform(updated);
// }
// ```
//--------------------------------------------------------------