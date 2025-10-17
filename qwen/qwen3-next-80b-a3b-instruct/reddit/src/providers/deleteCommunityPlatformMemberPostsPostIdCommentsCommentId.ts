import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function deleteCommunityPlatformMemberPostsPostIdCommentsCommentId(props: {
  postId: string & tags.Format<"uuid">;
  commentId: string & tags.Format<"uuid">;
}): Promise<void> {
  try {
    // Verify the comment exists and belongs to the specified post
    const comment =
      await MyGlobal.prisma.community_platform_comments.findUnique({
        where: {
          id: props.commentId,
        },
        select: {
          community_platform_post_id: true,
        },
      });

    if (!comment) {
      throw new HttpException("Comment not found", 404);
    }

    // Ensure the comment belongs to the specified post
    if (comment.community_platform_post_id !== props.postId) {
      throw new HttpException(
        "Comment does not belong to the specified post",
        404,
      );
    }

    // Delete the comment (cascade will delete nested replies)
    await MyGlobal.prisma.community_platform_comments.delete({
      where: {
        id: props.commentId,
      },
    });
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError) {
      if (error.code === "P2025") {
        throw new HttpException("Comment not found", 404);
      }
    }
    throw new HttpException("Failed to delete comment", 500);
  }
}
