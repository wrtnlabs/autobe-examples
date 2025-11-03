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

export async function postDiscussionBoardMemberArticlesArticleIdComments(props: {
  member: MemberPayload;
  articleId: string & tags.Format<"uuid">;
  body: IDiscussionBoardComment.ICreate;
}): Promise<IDiscussionBoardComment> {
  const { member, articleId, body } = props;

  // Validate article exists and is published
  const article = await MyGlobal.prisma.discussion_board_articles.findFirst({
    where: {
      id: articleId,
      status: "published",
      deleted_at: null,
    },
  });

  if (!article) {
    throw new HttpException("Article not found or not published", 404);
  }

  // Validate parent comment if provided (single-level threading)
  if (
    body.discussion_board_parent_comment_id !== undefined &&
    body.discussion_board_parent_comment_id !== null
  ) {
    const parentComment =
      await MyGlobal.prisma.discussion_board_comments.findFirst({
        where: {
          id: body.discussion_board_parent_comment_id,
          discussion_board_article_id: articleId,
          discussion_board_parent_comment_id: null,
          deleted_at: null,
        },
      });

    if (!parentComment) {
      throw new HttpException(
        "Parent comment not found or is not a top-level comment",
        404,
      );
    }
  }

  const now = toISOStringSafe(new Date());
  const commentId = v4();

  await MyGlobal.prisma.discussion_board_comments.create({
    data: {
      id: commentId,
      discussion_board_article_id: articleId,
      discussion_board_parent_comment_id:
        body.discussion_board_parent_comment_id ?? null,
      discussion_board_member_id: member.id,
      discussion_board_moderator_id: null,
      author_type: "member",
      content: body.content,
      created_at: now,
      updated_at: now,
      deleted_at: null,
    },
  });

  const memberAuthor =
    await MyGlobal.prisma.discussion_board_members.findUniqueOrThrow({
      where: { id: member.id },
    });

  return {
    id: commentId,
    discussion_board_article_id: articleId,
    discussion_board_parent_comment_id:
      body.discussion_board_parent_comment_id ?? null,
    discussion_board_member_id: member.id,
    discussion_board_moderator_id: null,
    author_type: "member",
    content: body.content,
    created_at: now,
    updated_at: now,
    deleted_at: null,
    memberAuthor: {
      id: memberAuthor.id,
      username: memberAuthor.username,
      display_name: memberAuthor.display_name ?? null,
      profile_picture_url: memberAuthor.profile_picture_url ?? null,
    },
    moderatorAuthor: null,
  };
}
