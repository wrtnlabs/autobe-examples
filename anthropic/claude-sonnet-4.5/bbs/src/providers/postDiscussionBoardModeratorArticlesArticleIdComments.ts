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

export async function postDiscussionBoardModeratorArticlesArticleIdComments(props: {
  moderator: ModeratorPayload;
  articleId: string & tags.Format<"uuid">;
  body: IDiscussionBoardComment.ICreate;
}): Promise<IDiscussionBoardComment> {
  const { moderator, articleId, body } = props;

  // Verify article exists and is accessible
  const article = await MyGlobal.prisma.discussion_board_articles.findFirst({
    where: {
      id: articleId,
      deleted_at: null,
      status: "published",
    },
  });

  if (!article) {
    throw new HttpException("Article not found or not accessible", 404);
  }

  // If parent comment ID provided, validate single-level threading
  if (
    body.discussion_board_parent_comment_id !== undefined &&
    body.discussion_board_parent_comment_id !== null
  ) {
    const parentComment =
      await MyGlobal.prisma.discussion_board_comments.findFirst({
        where: {
          id: body.discussion_board_parent_comment_id,
          discussion_board_article_id: articleId,
          deleted_at: null,
        },
      });

    if (!parentComment) {
      throw new HttpException("Parent comment not found", 404);
    }

    // Enforce single-level threading: parent must be top-level
    if (parentComment.discussion_board_parent_comment_id !== null) {
      throw new HttpException(
        "Cannot reply to a reply - single-level threading only",
        400,
      );
    }
  }

  const now = toISOStringSafe(new Date());
  const commentId = v4();

  // Create the comment
  await MyGlobal.prisma.discussion_board_comments.create({
    data: {
      id: commentId,
      discussion_board_article_id: articleId,
      discussion_board_parent_comment_id:
        body.discussion_board_parent_comment_id ?? null,
      discussion_board_member_id: null,
      discussion_board_moderator_id: moderator.id,
      author_type: "moderator",
      content: body.content,
      created_at: now,
      updated_at: now,
      deleted_at: null,
    },
  });

  // Fetch moderator information for response
  const moderatorInfo =
    await MyGlobal.prisma.discussion_board_moderators.findUniqueOrThrow({
      where: { id: moderator.id },
    });

  return {
    id: commentId,
    discussion_board_article_id: articleId,
    discussion_board_parent_comment_id:
      body.discussion_board_parent_comment_id ?? null,
    discussion_board_member_id: null,
    discussion_board_moderator_id: moderator.id,
    author_type: "moderator",
    content: body.content,
    created_at: now,
    updated_at: now,
    deleted_at: null,
    memberAuthor: null,
    moderatorAuthor: {
      id: moderatorInfo.id,
      username: moderatorInfo.username,
      display_name: moderatorInfo.display_name,
      profile_picture_url: moderatorInfo.profile_picture_url,
      email_verified: moderatorInfo.email_verified,
      status: moderatorInfo.status,
      moderation_permissions: moderatorInfo.moderation_permissions,
      profile_visibility: moderatorInfo.profile_visibility,
      activity_visibility: moderatorInfo.activity_visibility,
      bio: moderatorInfo.bio,
      location: moderatorInfo.location,
      website_url: moderatorInfo.website_url,
      last_login_at: moderatorInfo.last_login_at
        ? toISOStringSafe(moderatorInfo.last_login_at)
        : null,
      created_at: toISOStringSafe(moderatorInfo.created_at),
      updated_at: toISOStringSafe(moderatorInfo.updated_at),
      deleted_at: moderatorInfo.deleted_at
        ? toISOStringSafe(moderatorInfo.deleted_at)
        : null,
    },
  };
}
