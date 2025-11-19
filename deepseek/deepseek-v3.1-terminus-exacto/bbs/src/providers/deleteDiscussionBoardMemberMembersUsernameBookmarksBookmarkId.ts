import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
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

export async function deleteDiscussionBoardMemberMembersUsernameBookmarksBookmarkId(props: {
  member: MemberPayload;
  username: string;
  bookmarkId: string & tags.Format<"uuid">;
}): Promise<IDiscussionBoardUserBookmark> {
  // Verify that the authenticated member matches the username parameter
  const memberRecord = await MyGlobal.prisma.discussion_board_members.findFirst(
    {
      where: {
        id: props.member.id,
        deleted_at: null,
      },
    },
  );

  if (!memberRecord) {
    throw new HttpException("Member not found", 404);
  }

  if (memberRecord.username !== props.username) {
    throw new HttpException("Forbidden", 403);
  }

  // Find the bookmark to verify ownership and existence
  const bookmark =
    await MyGlobal.prisma.discussion_board_user_bookmarks.findFirst({
      where: {
        id: props.bookmarkId,
        discussion_board_member_id: props.member.id,
        deleted_at: null,
      },
    });

  if (!bookmark) {
    throw new HttpException("Bookmark not found", 404);
  }

  // Perform soft delete
  const updatedBookmark =
    await MyGlobal.prisma.discussion_board_user_bookmarks.update({
      where: {
        id: props.bookmarkId,
      },
      data: {
        deleted_at: new Date(),
        updated_at: new Date(),
      },
    });

  // Get member and post details for the response
  const [memberDetails, postDetails] = await Promise.all([
    MyGlobal.prisma.discussion_board_members.findFirst({
      where: {
        id: updatedBookmark.discussion_board_member_id,
        deleted_at: null,
      },
      select: {
        id: true,
        username: true,
      },
    }),
    MyGlobal.prisma.discussion_board_posts.findFirst({
      where: {
        id: updatedBookmark.discussion_board_post_id,
        deleted_at: null,
      },
      select: {
        id: true,
        title: true,
      },
    }),
  ]);

  if (!memberDetails || !postDetails) {
    throw new HttpException("Associated member or post not found", 404);
  }

  // Transform to match the DTO interface
  return {
    id: updatedBookmark.id,
    discussion_board_member_id: updatedBookmark.discussion_board_member_id,
    discussion_board_post_id: updatedBookmark.discussion_board_post_id,
    member: {
      id: memberDetails.id,
      type: "member",
      name: memberDetails.username,
    },
    post: {
      id: postDetails.id,
      type: "post",
      title: postDetails.title,
    },
    created_at: toISOStringSafe(updatedBookmark.created_at),
    updated_at: toISOStringSafe(updatedBookmark.updated_at),
    deleted_at: updatedBookmark.deleted_at
      ? toISOStringSafe(updatedBookmark.deleted_at)
      : undefined,
  };
}
