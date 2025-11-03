import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IDiscussionBoardComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardComment";
import { IDiscussionBoardMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardMember";
import { IDiscussionBoardModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardModerator";
import { MemberPayload } from "../decorators/payload/MemberPayload";

export async function postDiscussionBoardMemberArticlesArticleIdCommentsCommentIdReplies(props: {
  member: MemberPayload;
  articleId: string & tags.Format<"uuid">;
  commentId: string & tags.Format<"uuid">;
  body: IDiscussionBoardComment.ICreate;
}): Promise<IDiscussionBoardComment> {
  const { member, articleId, commentId, body } = props;

  // Validate parent comment exists and belongs to the specified article
  const parentComment =
    await MyGlobal.prisma.discussion_board_comments.findFirst({
      where: {
        id: commentId,
        discussion_board_article_id: articleId,
        deleted_at: null,
      },
    });

  if (!parentComment) {
    throw new HttpException(
      "Parent comment not found or does not belong to the specified article",
      404,
    );
  }

  // Enforce single-level threading: parent comment must be top-level
  if (parentComment.discussion_board_parent_comment_id !== null) {
    throw new HttpException(
      "Cannot create nested replies - parent comment must be a top-level comment",
      400,
    );
  }

  // Create the reply comment
  const now = toISOStringSafe(new Date());
  const replyId = v4() as string & tags.Format<"uuid">;

  const created = await MyGlobal.prisma.discussion_board_comments.create({
    data: {
      id: replyId,
      discussion_board_article_id: articleId,
      discussion_board_parent_comment_id: commentId,
      discussion_board_member_id: member.id,
      discussion_board_moderator_id: null,
      author_type: "member",
      content: body.content,
      created_at: now,
      updated_at: now,
      deleted_at: null,
    },
  });

  // Fetch member author details
  const memberAuthor =
    await MyGlobal.prisma.discussion_board_members.findUniqueOrThrow({
      where: { id: member.id },
    });

  return {
    id: created.id as string & tags.Format<"uuid">,
    discussion_board_article_id: created.discussion_board_article_id as string &
      tags.Format<"uuid">,
    discussion_board_parent_comment_id:
      created.discussion_board_parent_comment_id === null
        ? undefined
        : (created.discussion_board_parent_comment_id as string &
            tags.Format<"uuid">),
    discussion_board_member_id:
      created.discussion_board_member_id === null
        ? undefined
        : (created.discussion_board_member_id as string & tags.Format<"uuid">),
    discussion_board_moderator_id:
      created.discussion_board_moderator_id === null
        ? undefined
        : (created.discussion_board_moderator_id as string &
            tags.Format<"uuid">),
    author_type: created.author_type,
    content: created.content,
    created_at: toISOStringSafe(created.created_at),
    updated_at: toISOStringSafe(created.updated_at),
    deleted_at: created.deleted_at ? toISOStringSafe(created.deleted_at) : null,
    memberAuthor: {
      id: memberAuthor.id as string & tags.Format<"uuid">,
      username: memberAuthor.username,
      display_name:
        memberAuthor.display_name === null
          ? undefined
          : memberAuthor.display_name,
      profile_picture_url:
        memberAuthor.profile_picture_url === null
          ? undefined
          : (memberAuthor.profile_picture_url as string & tags.Format<"uri">),
    },
    moderatorAuthor: null,
  };
}
