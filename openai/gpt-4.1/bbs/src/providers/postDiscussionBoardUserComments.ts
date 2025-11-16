import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IDiscussionBoardComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardComment";
import { IDiscussionBoardCommentAttachment } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardCommentAttachment";
import { IDiscussionBoardArticle } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticle";
import { IDiscussionBoardUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardUser";
import { IDiscussionBoardAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdmin";
import { UserPayload } from "../decorators/payload/UserPayload";

export async function postDiscussionBoardUserComments(props: {
  user: UserPayload;
  body: IDiscussionBoardComment.ICreate;
}): Promise<IDiscussionBoardComment> {
  const article = await MyGlobal.prisma.discussion_board_articles.findUnique({
    where: { id: props.body.discussion_board_article_id },
  });
  if (!article) {
    throw new HttpException("Target article not found.", 404);
  }

  const user = await MyGlobal.prisma.discussion_board_users.findUnique({
    where: { id: props.user.id },
  });
  if (
    !user ||
    user.deleted_at !== null ||
    user.is_active !== true ||
    user.is_blocked === true ||
    user.is_email_verified !== true
  ) {
    throw new HttpException("User is not eligible to comment.", 403);
  }

  const now: string = toISOStringSafe(new Date());
  const commentId: string = v4();
  const comment = await MyGlobal.prisma.discussion_board_comments.create({
    data: {
      id: commentId,
      discussion_board_article_id: props.body.discussion_board_article_id,
      discussion_board_user_id: props.user.id,
      discussion_board_admin_id: null,
      body: props.body.body,
      created_at: now,
      updated_at: now,
      deleted_at: null,
    },
  });

  let attachments: IDiscussionBoardCommentAttachment.ISummary[] = [];
  if (
    Array.isArray(props.body.attachments) &&
    props.body.attachments.length > 0
  ) {
    const createAttachments = props.body.attachments
      .slice(0, 2)
      .map(async (a) => {
        const newAttachment =
          await MyGlobal.prisma.discussion_board_comment_attachments.create({
            data: {
              id: v4(),
              discussion_board_comment_id: commentId,
              file_url: a.file_url,
              original_filename: a.original_filename,
              mime_type: a.mime_type,
              file_size_bytes: a.file_size_bytes,
              created_at: now,
            },
          });
        return {
          id: newAttachment.id,
          discussion_board_comment_id:
            newAttachment.discussion_board_comment_id,
          file_url: newAttachment.file_url,
          original_filename: newAttachment.original_filename,
          mime_type: newAttachment.mime_type,
          file_size_bytes: newAttachment.file_size_bytes,
          created_at: toISOStringSafe(newAttachment.created_at),
        };
      });
    attachments = await Promise.all(createAttachments);
  }

  const author: IDiscussionBoardUser.ISummary = {
    id: user.id,
    email: user.email,
    is_email_verified: user.is_email_verified,
    is_active: user.is_active,
    is_blocked: user.is_blocked,
    created_at: toISOStringSafe(user.created_at),
    updated_at: toISOStringSafe(user.updated_at),
    deleted_at: user.deleted_at ? toISOStringSafe(user.deleted_at) : undefined,
  };

  let articleAuthor:
    | IDiscussionBoardUser.ISummary
    | IDiscussionBoardAdmin.ISummary;
  if (article.author_user_id !== null) {
    const articleUser = await MyGlobal.prisma.discussion_board_users.findUnique(
      {
        where: { id: article.author_user_id },
      },
    );
    if (!articleUser) {
      throw new HttpException("Article author user not found", 500);
    }
    articleAuthor = {
      id: articleUser.id,
      email: articleUser.email,
      is_email_verified: articleUser.is_email_verified,
      is_active: articleUser.is_active,
      is_blocked: articleUser.is_blocked,
      created_at: toISOStringSafe(articleUser.created_at),
      updated_at: toISOStringSafe(articleUser.updated_at),
      deleted_at: articleUser.deleted_at
        ? toISOStringSafe(articleUser.deleted_at)
        : undefined,
    };
  } else if (article.author_admin_id !== null) {
    const articleAdmin =
      await MyGlobal.prisma.discussion_board_admins.findUnique({
        where: { id: article.author_admin_id },
      });
    if (!articleAdmin) {
      throw new HttpException("Article author admin not found", 500);
    }
    articleAuthor = {
      id: articleAdmin.id,
      display_name: `Administrator ${articleAdmin.id}`,
    };
  } else {
    throw new HttpException("Article author data missing.", 500);
  }
  const articleSummary: IDiscussionBoardArticle.ISummary = {
    id: article.id,
    title: article.title,
    created_at: toISOStringSafe(article.created_at),
    updated_at: toISOStringSafe(article.updated_at),
    author: articleAuthor,
  };

  return {
    id: comment.id,
    article: articleSummary,
    author,
    body: comment.body,
    attachments,
    created_at: toISOStringSafe(comment.created_at),
    updated_at: toISOStringSafe(comment.updated_at),
    deleted_at: comment.deleted_at
      ? toISOStringSafe(comment.deleted_at)
      : undefined,
  };
}
