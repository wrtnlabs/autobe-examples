import { ICommunityPlatformComment } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformComment";
import { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";
import { ICommunityPlatformPost } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPost";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { MemberPayload } from "../decorators/payload/MemberPayload";
import { CommunityPlatformCommentTransformer } from "../transformers/CommunityPlatformCommentTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

// DON'T CHANGE FUNCTION NAME AND PARAMETERS,
// ONLY YOU HAVE TO WRITE THIS FUNCTION BODY, AND USE IMPORTED.
export async function putCommunityPlatformMemberPostsPostIdCommentsCommentId(props: {
  member: MemberPayload;
  postId: string & tags.Format<"uuid">;
  commentId: string & tags.Format<"uuid">;
  body: ICommunityPlatformComment.IUpdate;
}): Promise<ICommunityPlatformComment> {
  // Validate post exists and is not deleted
  const post = await MyGlobal.prisma.community_platform_posts.findUniqueOrThrow(
    {
      where: { id: props.postId },
    },
  );
  if (post.deleted_at !== null) {
    throw new HttpException("Post has been deleted", 400);
  }
  // Validate comment exists, belongs to post, and is not deleted
  const comment =
    await MyGlobal.prisma.community_platform_comments.findUniqueOrThrow({
      where: { id: props.commentId },
      select: {
        id: true,
        member_id: true,
        post_id: true,
        deleted_at: true,
      },
    });
  if (comment.deleted_at !== null) {
    throw new HttpException("Comment has been deleted", 400);
  }
  if (comment.post_id !== props.postId) {
    throw new HttpException(
      "Comment does not belong to the specified post",
      400,
    );
  }
  // Authorization check
  if (comment.member_id !== props.member.id) {
    throw new HttpException("Forbidden", 403);
  }
  // Content validation - IUpdate has optional content field
  if (
    props.body.content === undefined ||
    props.body.content.trim().length === 0
  ) {
    throw new HttpException("Content cannot be empty", 400);
  }
  // Update comment - Prisma accepts Date object for DateTime columns
  await MyGlobal.prisma.community_platform_comments.update({
    where: { id: props.commentId },
    data: {
      content: props.body.content,
      updated_at: new Date(),
    },
  });
  // Fetch and return updated comment using transformer
  const updated =
    await MyGlobal.prisma.community_platform_comments.findUniqueOrThrow({
      where: { id: props.commentId },
      ...CommunityPlatformCommentTransformer.select(),
    });
  return await CommunityPlatformCommentTransformer.transform(updated);
}
