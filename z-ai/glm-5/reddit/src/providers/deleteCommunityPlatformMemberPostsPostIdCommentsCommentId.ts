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

export async function deleteCommunityPlatformMemberPostsPostIdCommentsCommentId(props: {
  member: MemberPayload;
  postId: string & tags.Format<"uuid">;
  commentId: string & tags.Format<"uuid">;
}): Promise<void> {
  // Step 1: Verify comment exists and belongs to the specified post
  const comment =
    await MyGlobal.prisma.community_platform_comments.findFirstOrThrow({
      where: {
        id: props.commentId,
        community_platform_post_id: props.postId,
        deleted_at: null,
      },
      select: {
        id: true,
        community_platform_member_id: true,
        post: {
          select: {
            community_id: true,
          },
        },
      },
    });
  // Step 2: Authorization check - author or moderator
  const isAuthor = comment.community_platform_member_id === props.member.id;
  let isModerator = false;
  if (!isAuthor) {
    const moderatorRecord =
      await MyGlobal.prisma.community_platform_moderators.findFirst({
        where: {
          community_platform_member_id: props.member.id,
          community_platform_community_id: comment.post.community_id,
          deleted_at: null,
        },
      });
    isModerator = moderatorRecord !== null;
  }
  if (!isAuthor && !isModerator) {
    throw new HttpException("Forbidden", 403);
  }
  // Step 3: Delete the comment (CASCADE handles replies)
  await MyGlobal.prisma.community_platform_comments.delete({
    where: { id: props.commentId },
  });
}
