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

export async function putCommunityPlatformMemberPostsPostIdCommentsCommentId(props: {
  member: MemberPayload;
  postId: string & tags.Format<"uuid">;
  commentId: string & tags.Format<"uuid">;
  body: ICommunityPlatformComment.IUpdate;
}): Promise<ICommunityPlatformComment> {
  // Verify post exists and is not deleted
  await MyGlobal.prisma.community_platform_posts.findUniqueOrThrow({
    where: {
      id: props.postId,
      deleted_at: null,
    },
    select: { id: true },
  });
  // Fetch comment for validation
  const comment =
    await MyGlobal.prisma.community_platform_comments.findUniqueOrThrow({
      where: { id: props.commentId },
      select: {
        id: true,
        post_id: true,
        author_id: true,
        deleted_at: true,
      },
    });
  // Verify comment belongs to the specified post
  if (comment.post_id !== props.postId) {
    throw new HttpException("Comment not found", 404);
  }
  // Verify member is the author
  if (comment.author_id !== props.member.id) {
    throw new HttpException("Forbidden", 403);
  }
  // Verify comment is not deleted
  if (comment.deleted_at !== null) {
    throw new HttpException("Comment has been deleted", 410);
  }
  // Update comment content and timestamp
  const updated = await MyGlobal.prisma.community_platform_comments.update({
    where: { id: props.commentId },
    data: {
      content: props.body.content,
      updated_at: new Date(),
    },
    ...CommunityPlatformCommentTransformer.select(),
  });
  return await CommunityPlatformCommentTransformer.transform(updated);
}
