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

export async function deleteRedditCloneMemberPostsPostIdCommentsCommentId(props: {
  member: MemberPayload;
  postId: string & tags.Format<"uuid">;
  commentId: string & tags.Format<"uuid">;
}): Promise<void> {
  // Find the comment with author and post information
  const comment = await MyGlobal.prisma.reddit_clone_comments.findUniqueOrThrow(
    {
      where: { id: props.commentId },
      select: {
        id: true,
        reddit_clone_user_profile_id: true,
        post: {
          select: {
            id: true,
            reddit_clone_community_id: true,
          },
        },
      },
    },
  );
  // Get the member's profile ID
  const memberProfile =
    await MyGlobal.prisma.reddit_clone_user_profiles.findFirst({
      where: {
        reddit_clone_member_id: props.member.id,
        deleted_at: null,
      },
      select: { id: true },
    });
  if (memberProfile === null) {
    throw new HttpException("User profile not found", 404);
  }
  // Check if member is the comment author
  const isAuthor = comment.reddit_clone_user_profile_id === memberProfile.id;
  // Check if member is a moderator of the post's community
  const isModerator =
    await MyGlobal.prisma.reddit_clone_community_moderators.findFirst({
      where: {
        reddit_clone_community_id: comment.post.reddit_clone_community_id,
        reddit_clone_user_profile_id: memberProfile.id,
        deleted_at: null,
      },
    });
  // Verify authorization
  if (!isAuthor && isModerator === null) {
    throw new HttpException("Forbidden", 403);
  }
  // Soft delete the comment
  await MyGlobal.prisma.reddit_clone_comments.update({
    where: { id: props.commentId },
    data: {
      deleted_at: new Date(),
    },
  });
}
