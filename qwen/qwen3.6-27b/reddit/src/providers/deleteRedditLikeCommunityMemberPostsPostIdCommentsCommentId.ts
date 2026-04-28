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

export async function deleteRedditLikeCommunityMemberPostsPostIdCommentsCommentId(props: {
  member: MemberPayload;
  postId: string & tags.Format<"uuid">;
  commentId: string & tags.Format<"uuid">;
}): Promise<void> {
  const comment =
    await MyGlobal.prisma.reddit_like_community_post_comments.findUniqueOrThrow(
      {
        where: { id: props.commentId },
        select: {
          id: true,
          reddit_like_community_post_id: true,
          reddit_like_community_member_id: true,
          deleted_at: true,
        },
      },
    );
  if (comment.deleted_at !== null) {
    throw new HttpException("Comment already deleted", 410);
  }
  if (comment.reddit_like_community_post_id !== props.postId) {
    throw new HttpException("Comment not found", 404);
  }
  if (comment.reddit_like_community_member_id === props.member.id) {
    await MyGlobal.prisma.reddit_like_community_post_comments.update({
      where: { id: props.commentId },
      data: { deleted_at: new Date() },
    });
    return;
  }
  const post =
    await MyGlobal.prisma.reddit_like_community_posts.findUniqueOrThrow({
      where: { id: props.postId },
      select: { community_id: true },
    });
  const moderator =
    await MyGlobal.prisma.reddit_like_community_community_moderators.findFirst({
      where: {
        reddit_like_community_member_id: props.member.id,
        reddit_like_community_community_id: post.community_id,
        role: { in: ["OWNER", "MODERATOR"] },
      },
    });
  if (moderator === null) {
    throw new HttpException("Forbidden", 403);
  }
  await MyGlobal.prisma.reddit_like_community_post_comments.update({
    where: { id: props.commentId },
    data: { deleted_at: new Date() },
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
// export async function deleteRedditLikeCommunityMemberPostsPostIdCommentsCommentId(props: {
//   member: MemberPayload;
//   postId: string & tags.Format<"uuid">;
//   commentId: string & tags.Format<"uuid">;
// }): Promise<void> {
//   await MyGlobal.prisma.....delete({
//     where: { ... },
//   });
// }
// ```
//--------------------------------------------------------------