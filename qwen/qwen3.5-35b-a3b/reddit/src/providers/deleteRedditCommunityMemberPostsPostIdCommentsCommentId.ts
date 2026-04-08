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

export async function deleteRedditCommunityMemberPostsPostIdCommentsCommentId(props: {
  member: MemberPayload;
  postId: string & tags.Format<"uuid">;
  commentId: string & tags.Format<"uuid">;
}): Promise<void> {
  // Step 1: Verify the comment exists and get its details
  const comment =
    await MyGlobal.prisma.reddit_community_comments.findUniqueOrThrow({
      where: { id: props.commentId },
      select: {
        id: true,
        reddit_community_post_id: true,
        reddit_community_member_id: true,
        deleted_at: true,
      },
    });
  // Step 2: Verify the comment belongs to the specified post
  if (comment.reddit_community_post_id !== props.postId) {
    throw new HttpException(
      "Comment does not belong to the specified post",
      409,
    );
  }
  // Step 3: Verify the comment is not already deleted
  if (comment.deleted_at !== null) {
    throw new HttpException("Comment is already deleted", 400);
  }
  // Step 4: Verify the user is either the author or a moderator
  const isAuthor = comment.reddit_community_member_id === props.member.id;
  let isModerator = false;
  if (!isAuthor) {
    // Step 4a: Get the post to find which community it belongs to
    const post = await MyGlobal.prisma.reddit_community_posts.findUniqueOrThrow(
      {
        where: { id: props.postId },
        select: { reddit_community_community_id: true },
      },
    );
    // Step 4b: Check if the user has a moderator role in that community
    const moderatorRole =
      await MyGlobal.prisma.reddit_community_moderator_roles.findFirst({
        where: {
          reddit_community_member_id: props.member.id,
          reddit_community_community_id: post.reddit_community_community_id,
          deleted_at: null,
        },
      });
    isModerator = moderatorRole !== null;
  }
  if (!isAuthor && !isModerator) {
    throw new HttpException("Forbidden", 403);
  }
  // Step 5: Soft delete the comment
  await MyGlobal.prisma.reddit_community_comments.update({
    where: { id: props.commentId },
    data: { deleted_at: new Date() },
  });
  // Note: Child comments (replies) will be cascade-deleted automatically by Prisma
  // via the onDelete: Cascade relation on the "parent" relationship.
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
// export async function deleteRedditCommunityMemberPostsPostIdCommentsCommentId(props: {
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