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
import { ModeratorPayload } from "../decorators/payload/ModeratorPayload";

export async function postDiscussionBoardModeratorArticlesArticleIdCommentsCommentIdReplies(props: {
  moderator: ModeratorPayload;
  articleId: string & tags.Format<"uuid">;
  commentId: string & tags.Format<"uuid">;
  body: IDiscussionBoardComment.ICreate;
}): Promise<IDiscussionBoardComment> {
  const { moderator, articleId, commentId, body } = props;

  // Validate parent comment exists and is top-level (single-level threading constraint)
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
      "Parent comment not found or has been deleted",
      404,
    );
  }

  // Enforce single-level threading: parent comment must be top-level
  if (parentComment.discussion_board_parent_comment_id !== null) {
    throw new HttpException(
      "Cannot reply to a reply comment. Single-level threading only.",
      400,
    );
  }

  // Validate article exists and is not deleted
  const article = await MyGlobal.prisma.discussion_board_articles.findFirst({
    where: {
      id: articleId,
      deleted_at: null,
    },
  });

  if (!article) {
    throw new HttpException("Article not found or has been deleted", 404);
  }

  // Create reply comment
  const now = toISOStringSafe(new Date());
  const replyId = v4();

  const created = await MyGlobal.prisma.discussion_board_comments.create({
    data: {
      id: replyId,
      discussion_board_article_id: articleId,
      discussion_board_parent_comment_id: commentId,
      discussion_board_member_id: null,
      discussion_board_moderator_id: moderator.id,
      author_type: "moderator",
      content: body.content,
      created_at: now,
      updated_at: now,
      deleted_at: null,
    },
  });

  // Fetch moderator summary for response
  const moderatorAuthor =
    await MyGlobal.prisma.discussion_board_moderators.findUniqueOrThrow({
      where: { id: moderator.id },
      select: {
        id: true,
        username: true,
        display_name: true,
        profile_picture_url: true,
        email_verified: true,
        status: true,
        moderation_permissions: true,
        profile_visibility: true,
        activity_visibility: true,
        bio: true,
        location: true,
        website_url: true,
        last_login_at: true,
        created_at: true,
        updated_at: true,
        deleted_at: true,
      },
    });

  return {
    id: replyId,
    discussion_board_article_id: articleId,
    discussion_board_parent_comment_id: commentId,
    discussion_board_member_id: undefined,
    discussion_board_moderator_id: moderator.id,
    author_type: "moderator",
    content: created.content,
    created_at: toISOStringSafe(created.created_at),
    updated_at: toISOStringSafe(created.updated_at),
    deleted_at: null,
    memberAuthor: undefined,
    moderatorAuthor: {
      id: moderatorAuthor.id,
      username: moderatorAuthor.username,
      display_name: moderatorAuthor.display_name,
      profile_picture_url: moderatorAuthor.profile_picture_url,
      email_verified: moderatorAuthor.email_verified,
      status: moderatorAuthor.status,
      moderation_permissions: moderatorAuthor.moderation_permissions,
      profile_visibility: moderatorAuthor.profile_visibility,
      activity_visibility: moderatorAuthor.activity_visibility,
      bio: moderatorAuthor.bio ?? undefined,
      location: moderatorAuthor.location ?? undefined,
      website_url: moderatorAuthor.website_url ?? undefined,
      last_login_at: moderatorAuthor.last_login_at
        ? toISOStringSafe(moderatorAuthor.last_login_at)
        : undefined,
      created_at: toISOStringSafe(moderatorAuthor.created_at),
      updated_at: toISOStringSafe(moderatorAuthor.updated_at),
      deleted_at: moderatorAuthor.deleted_at
        ? toISOStringSafe(moderatorAuthor.deleted_at)
        : undefined,
    },
  };
}
