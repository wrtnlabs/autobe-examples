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

// DON'T CHANGE FUNCTION NAME AND PARAMETERS,
// ONLY YOU HAVE TO WRITE THIS FUNCTION BODY, AND USE IMPORTED.
export async function deleteCommunityPlatformMemberPostsPostIdCommentsCommentId(props: {
  member: MemberPayload;
  postId: string & tags.Format<"uuid">;
  commentId: string & tags.Format<"uuid">;
}): Promise<void> {
  // Step 1: Validate the comment exists, is not already soft-deleted,
  // and belongs to the requested post
  // (Per section 180: attempting to delete an already-deleted comment
  // returns 404 not found)
  const comment = await MyGlobal.prisma.community_platform_comments.findFirst({
    where: {
      id: props.commentId,
      community_platform_post_id: props.postId,
      deleted_at: null,
    },
    select: {
      id: true,
      community_platform_member_id: true,
    },
  });
  if (comment === null) {
    throw new HttpException("Comment not found", 404);
  }
  // Step 2: Fetch the post to determine the community for authorization
  const post = await MyGlobal.prisma.community_platform_posts.findUniqueOrThrow(
    {
      where: { id: props.postId },
      select: {
        community_id: true,
      },
    },
  );
  // Step 3: Authorization — the authenticated member must be EITHER
  // a) the original comment author, OR
  // b) a moderator or owner of the community that hosts the post
  const isAuthor: boolean =
    comment.community_platform_member_id === props.member.id;
  if (isAuthor === false) {
    const moderator =
      await MyGlobal.prisma.community_platform_moderators.findFirst({
        where: {
          member_id: props.member.id,
          community_id: post.community_id,
          role: { in: ["owner", "moderator"] },
        },
        select: { id: true },
      });
    if (moderator === null) {
      throw new HttpException("Forbidden", 403);
    }
  }
  // Step 4: Soft delete — set deleted_at to current timestamp.
  // Prisma accepts string ISO 8601 values for DateTime fields
  await MyGlobal.prisma.community_platform_comments.update({
    where: { id: props.commentId },
    data: {
      deleted_at: new Date().toISOString(),
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
// export async function deleteCommunityPlatformMemberPostsPostIdCommentsCommentId(props: {
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