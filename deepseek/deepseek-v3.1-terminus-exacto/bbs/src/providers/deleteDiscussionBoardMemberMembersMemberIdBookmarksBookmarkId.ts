import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IDiscussionBoardUserBookmark } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardUserBookmark";
import { IDiscussionBoardMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardMember";
import { IDiscussionBoardPost } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardPost";
import { MemberPayload } from "../decorators/payload/MemberPayload";

export async function deleteDiscussionBoardMemberMembersMemberIdBookmarksBookmarkId(props: {
  member: MemberPayload;
  memberId: string & tags.Format<"uuid">;
  bookmarkId: string & tags.Format<"uuid">;
}): Promise<IDiscussionBoardUserBookmark> {
  // Validate that the authenticated member matches the member ID in the path
  if (props.member.id !== props.memberId) {
    throw new HttpException("You can only delete your own bookmarks", 403);
  }

  try {
    // Check if the bookmark exists and belongs to the member
    const existingBookmark =
      await MyGlobal.prisma.discussion_board_user_bookmarks.findFirst({
        where: {
          id: props.bookmarkId,
          discussion_board_member_id: props.memberId,
          deleted_at: null,
        },
        include: {
          member: {
            select: {
              id: true,
              username: true,
            },
          },
          post: {
            select: {
              id: true,
              title: true,
            },
          },
        },
      });

    if (!existingBookmark) {
      throw new HttpException("Bookmark not found", 404);
    }

    // Perform soft delete by setting deleted_at timestamp
    const updatedBookmark =
      await MyGlobal.prisma.discussion_board_user_bookmarks.update({
        where: {
          id: props.bookmarkId,
        },
        data: {
          deleted_at: new Date(),
          updated_at: new Date(),
        },
        include: {
          member: {
            select: {
              id: true,
              username: true,
            },
          },
          post: {
            select: {
              id: true,
              title: true,
            },
          },
        },
      });

    // Map to the DTO interface with proper null/undefined handling
    return {
      id: updatedBookmark.id,
      discussion_board_member_id: updatedBookmark.discussion_board_member_id,
      discussion_board_post_id: updatedBookmark.discussion_board_post_id,
      member: {
        id: updatedBookmark.member.id,
        type: "member",
        name: updatedBookmark.member.username,
      },
      post: {
        id: updatedBookmark.post.id,
        type: "post",
        title: updatedBookmark.post.title,
      },
      created_at: toISOStringSafe(updatedBookmark.created_at),
      updated_at: toISOStringSafe(updatedBookmark.updated_at),
      deleted_at: updatedBookmark.deleted_at
        ? toISOStringSafe(updatedBookmark.deleted_at)
        : null,
    };
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError) {
      if (error.code === "P2025") {
        throw new HttpException("Bookmark not found", 404);
      }
    }
    throw new HttpException("Failed to delete bookmark", 500);
  }
}
