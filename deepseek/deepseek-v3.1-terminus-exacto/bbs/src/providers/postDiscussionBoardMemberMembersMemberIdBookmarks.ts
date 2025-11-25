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

export async function postDiscussionBoardMemberMembersMemberIdBookmarks(props: {
  member: MemberPayload;
  memberId: string & tags.Format<"uuid">;
  body: IDiscussionBoardUserBookmark.ICreate;
}): Promise<IDiscussionBoardUserBookmark> {
  // Validate that the authenticated member matches the path parameter
  if (props.member.id !== props.memberId) {
    throw new HttpException(
      "You can only create bookmarks for your own account",
      403,
    );
  }

  // Verify the member exists and is active
  const member = await MyGlobal.prisma.discussion_board_members.findFirst({
    where: {
      id: props.memberId,
      deleted_at: null,
    },
  });

  if (!member) {
    throw new HttpException(
      "Member account not found or has been deleted",
      404,
    );
  }

  // Verify the target post exists and is published
  const post = await MyGlobal.prisma.discussion_board_posts.findFirst({
    where: {
      id: props.body.discussion_board_post_id,
      status: "published",
      deleted_at: null,
    },
  });

  if (!post) {
    throw new HttpException(
      "Post not found, not published, or has been deleted",
      404,
    );
  }

  // Check for existing bookmark to prevent duplicates
  const existingBookmark =
    await MyGlobal.prisma.discussion_board_user_bookmarks.findFirst({
      where: {
        discussion_board_member_id: props.memberId,
        discussion_board_post_id: props.body.discussion_board_post_id,
        deleted_at: null,
      },
    });

  if (existingBookmark) {
    throw new HttpException("You have already bookmarked this post", 409);
  }

  // Create the bookmark with current timestamp
  const currentTime = toISOStringSafe(new Date());

  const bookmark = await MyGlobal.prisma.discussion_board_user_bookmarks.create(
    {
      data: {
        id: v4() as string & tags.Format<"uuid">,
        discussion_board_member_id: props.memberId,
        discussion_board_post_id: props.body.discussion_board_post_id,
        created_at: currentTime,
        updated_at: currentTime,
        deleted_at: null,
      },
    },
  );

  // Fetch member details for summary
  const memberDetails =
    await MyGlobal.prisma.discussion_board_members.findUnique({
      where: { id: props.memberId },
      select: {
        id: true,
        username: true,
        display_name: true,
      },
    });

  if (!memberDetails) {
    throw new HttpException("Member details could not be retrieved", 500);
  }

  // Fetch post details for summary
  const postDetails = await MyGlobal.prisma.discussion_board_posts.findUnique({
    where: { id: props.body.discussion_board_post_id },
    select: {
      id: true,
      title: true,
    },
  });

  if (!postDetails) {
    throw new HttpException("Post details could not be retrieved", 500);
  }

  // Construct member summary
  const memberSummary: IDiscussionBoardMember.ISummary = {
    id: memberDetails.id,
    type: "member",
    name: memberDetails.display_name || memberDetails.username,
  };

  // Construct post summary
  const postSummary: IDiscussionBoardPost.ISummary = {
    id: postDetails.id,
    type: "post",
    title: postDetails.title,
  };

  return {
    id: bookmark.id,
    discussion_board_member_id: bookmark.discussion_board_member_id,
    discussion_board_post_id: bookmark.discussion_board_post_id,
    member: memberSummary,
    post: postSummary,
    created_at: toISOStringSafe(bookmark.created_at),
    updated_at: toISOStringSafe(bookmark.updated_at),
    deleted_at: bookmark.deleted_at
      ? toISOStringSafe(bookmark.deleted_at)
      : undefined,
  };
}
