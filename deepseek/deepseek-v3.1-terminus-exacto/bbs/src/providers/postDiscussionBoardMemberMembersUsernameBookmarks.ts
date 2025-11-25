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

export async function postDiscussionBoardMemberMembersUsernameBookmarks(props: {
  member: MemberPayload;
  username: string;
  body: IDiscussionBoardUserBookmark.ICreate;
}): Promise<IDiscussionBoardUserBookmark> {
  // Validate that the authenticated member matches the username in the path
  const memberRecord =
    await MyGlobal.prisma.discussion_board_members.findUnique({
      where: {
        id: props.member.id,
        deleted_at: null,
      },
    });

  if (!memberRecord) {
    throw new HttpException(
      "Member account not found or has been deleted",
      404,
    );
  }

  if (memberRecord.username !== props.username) {
    throw new HttpException(
      "You can only create bookmarks for your own account",
      403,
    );
  }

  // Verify the target post exists and is bookmarkable (published and not deleted)
  const post = await MyGlobal.prisma.discussion_board_posts.findUnique({
    where: {
      id: props.body.discussion_board_post_id,
      deleted_at: null,
      status: "published",
    },
  });

  if (!post) {
    throw new HttpException("Post not found, deleted, or not published", 404);
  }

  // Check for existing bookmark to prevent duplicates
  const existingBookmark =
    await MyGlobal.prisma.discussion_board_user_bookmarks.findFirst({
      where: {
        discussion_board_member_id: props.member.id,
        discussion_board_post_id: props.body.discussion_board_post_id,
        deleted_at: null,
      },
    });

  if (existingBookmark) {
    throw new HttpException("You have already bookmarked this post", 409);
  }

  // Create the bookmark with current timestamp
  const now = toISOStringSafe(new Date());
  const bookmark = await MyGlobal.prisma.discussion_board_user_bookmarks.create(
    {
      data: {
        id: v4() as string & tags.Format<"uuid">,
        discussion_board_member_id: props.member.id,
        discussion_board_post_id: props.body.discussion_board_post_id,
        created_at: now,
        updated_at: now,
        deleted_at: null,
      },
    },
  );

  // Construct member summary for the response
  const memberSummary: IDiscussionBoardMember.ISummary = {
    id: memberRecord.id,
    type: "member",
    name: memberRecord.display_name || memberRecord.username,
  };

  // Construct post summary for the response
  const postSummary: IDiscussionBoardPost.ISummary = {
    id: post.id,
    type: "post",
    title: post.title,
  };

  return {
    id: bookmark.id,
    discussion_board_member_id: bookmark.discussion_board_member_id,
    discussion_board_post_id: bookmark.discussion_board_post_id,
    member: memberSummary,
    post: postSummary,
    created_at: toISOStringSafe(bookmark.created_at),
    updated_at: toISOStringSafe(bookmark.updated_at),
    deleted_at:
      bookmark.deleted_at === null
        ? undefined
        : toISOStringSafe(bookmark.deleted_at),
  };
}
