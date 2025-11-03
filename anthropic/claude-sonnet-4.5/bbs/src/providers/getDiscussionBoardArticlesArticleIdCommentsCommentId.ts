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

export async function getDiscussionBoardArticlesArticleIdCommentsCommentId(props: {
  articleId: string & tags.Format<"uuid">;
  commentId: string & tags.Format<"uuid">;
}): Promise<IDiscussionBoardComment> {
  const { articleId, commentId } = props;

  const comment = await MyGlobal.prisma.discussion_board_comments.findFirst({
    where: {
      id: commentId,
      discussion_board_article_id: articleId,
      deleted_at: null,
    },
    include: {
      memberAuthor: true,
      moderatorAuthor: true,
    },
  });

  if (!comment) {
    throw new HttpException("Comment not found", 404);
  }

  const memberAuthorSummary: IDiscussionBoardMember.ISummary | null =
    comment.memberAuthor
      ? {
          id: comment.memberAuthor.id as string & tags.Format<"uuid">,
          username: comment.memberAuthor.username,
          display_name: comment.memberAuthor.display_name ?? null,
          profile_picture_url: comment.memberAuthor.profile_picture_url
            ? (comment.memberAuthor.profile_picture_url as string &
                tags.Format<"uri">)
            : null,
        }
      : null;

  const moderatorAuthorSummary: IDiscussionBoardModerator.ISummary | null =
    comment.moderatorAuthor
      ? {
          id: comment.moderatorAuthor.id as string & tags.Format<"uuid">,
          username: comment.moderatorAuthor.username,
          display_name: comment.moderatorAuthor.display_name,
          profile_picture_url: comment.moderatorAuthor.profile_picture_url
            ? (comment.moderatorAuthor.profile_picture_url as string &
                tags.Format<"uri">)
            : null,
          email_verified: comment.moderatorAuthor.email_verified,
          status: comment.moderatorAuthor.status,
          moderation_permissions:
            comment.moderatorAuthor.moderation_permissions,
          profile_visibility: comment.moderatorAuthor.profile_visibility,
          activity_visibility: comment.moderatorAuthor.activity_visibility,
          bio: comment.moderatorAuthor.bio ?? null,
          location: comment.moderatorAuthor.location ?? null,
          website_url: comment.moderatorAuthor.website_url
            ? (comment.moderatorAuthor.website_url as string &
                tags.Format<"uri">)
            : null,
          last_login_at: comment.moderatorAuthor.last_login_at
            ? toISOStringSafe(comment.moderatorAuthor.last_login_at)
            : null,
          created_at: toISOStringSafe(comment.moderatorAuthor.created_at),
          updated_at: toISOStringSafe(comment.moderatorAuthor.updated_at),
          deleted_at: comment.moderatorAuthor.deleted_at
            ? toISOStringSafe(comment.moderatorAuthor.deleted_at)
            : null,
        }
      : null;

  return {
    id: comment.id as string & tags.Format<"uuid">,
    discussion_board_article_id: comment.discussion_board_article_id as string &
      tags.Format<"uuid">,
    discussion_board_parent_comment_id:
      comment.discussion_board_parent_comment_id
        ? (comment.discussion_board_parent_comment_id as string &
            tags.Format<"uuid">)
        : null,
    discussion_board_member_id: comment.discussion_board_member_id
      ? (comment.discussion_board_member_id as string & tags.Format<"uuid">)
      : null,
    discussion_board_moderator_id: comment.discussion_board_moderator_id
      ? (comment.discussion_board_moderator_id as string & tags.Format<"uuid">)
      : null,
    author_type: comment.author_type,
    content: comment.content,
    created_at: toISOStringSafe(comment.created_at),
    updated_at: toISOStringSafe(comment.updated_at),
    deleted_at: comment.deleted_at ? toISOStringSafe(comment.deleted_at) : null,
    memberAuthor: memberAuthorSummary,
    moderatorAuthor: moderatorAuthorSummary,
  };
}
