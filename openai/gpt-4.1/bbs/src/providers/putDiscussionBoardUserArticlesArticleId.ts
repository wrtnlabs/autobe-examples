import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IDiscussionBoardArticle } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticle";
import { IDiscussionBoardArticleAttachment } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticleAttachment";
import { IDiscussionBoardUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardUser";
import { UserPayload } from "../decorators/payload/UserPayload";

export async function putDiscussionBoardUserArticlesArticleId(props: {
  user: UserPayload;
  articleId: string & tags.Format<"uuid">;
  body: IDiscussionBoardArticle.IUpdate;
}): Promise<IDiscussionBoardArticle> {
  // Step 1: Fetch article (must not be deleted)
  const article = await MyGlobal.prisma.discussion_board_articles.findUnique({
    where: { id: props.articleId, deleted_at: null },
  });
  if (!article) {
    throw new HttpException("Article not found", 404);
  }

  // Step 2: Only author allowed to update (no admin context)
  if (article.author_user_id !== props.user.id) {
    throw new HttpException("Only the article's author may update", 403);
  }

  // Step 3: Update article core fields
  const now = toISOStringSafe(new Date());
  await MyGlobal.prisma.discussion_board_articles.update({
    where: { id: props.articleId },
    data: {
      title: props.body.title ?? undefined,
      body: props.body.body ?? undefined,
      updated_at: now,
    },
  });

  // Step 4: Replace attachments if present
  if (props.body.attachments !== undefined) {
    // Soft delete all existing attachments for this article
    const existing =
      await MyGlobal.prisma.discussion_board_article_attachments.findMany({
        where: {
          discussion_board_article_id: props.articleId,
          deleted_at: null,
        },
      });
    const deleted_at = now;
    await Promise.all(
      existing.map((att) =>
        MyGlobal.prisma.discussion_board_article_attachments.update({
          where: { id: att.id },
          data: { deleted_at },
        }),
      ),
    );
    // Create all new provided as attachments (no reuse logic)
    await Promise.all(
      props.body.attachments.map((att) =>
        MyGlobal.prisma.discussion_board_article_attachments.create({
          data: {
            id: v4(),
            discussion_board_article_id: props.articleId,
            filename: att.filename ?? "",
            kind: att.kind ?? "document",
            mimetype: att.mimetype ?? "application/octet-stream",
            filesize: att.filesize ?? 0,
            virus_scanned: true,
            created_at: now,
            deleted_at: null,
          },
        }),
      ),
    );
  }

  // Step 5: Load updated article, with related attachments and author
  const updated =
    await MyGlobal.prisma.discussion_board_articles.findUniqueOrThrow({
      where: { id: props.articleId },
      include: {
        authorUser: true,
        discussion_board_article_attachments: true,
      },
    });

  // Step 6: Only include non-deleted attachments in API response
  const attachments = updated.discussion_board_article_attachments
    .filter((a) => a.deleted_at === null)
    .map((a) => ({
      id: a.id,
      discussion_board_article_id: a.discussion_board_article_id,
      filename: a.filename,
      kind: a.kind,
      mimetype: a.mimetype,
      filesize: a.filesize,
      virus_scanned: a.virus_scanned,
      created_at: toISOStringSafe(a.created_at),
      deleted_at: a.deleted_at ? toISOStringSafe(a.deleted_at) : undefined,
    }));

  // Step 7: Count only non-deleted comments
  const comments_count =
    await MyGlobal.prisma.discussion_board_article_comments.count({
      where: {
        discussion_board_article_id: updated.id,
        deleted_at: null,
      },
    });

  // Step 8: Compose author summary
  const author = {
    id: updated.authorUser.id,
    display_name: updated.authorUser.display_name,
    avatar_url: updated.authorUser.avatar_url ?? undefined,
  };

  return {
    id: updated.id,
    title: updated.title,
    body: updated.body,
    author,
    attachments,
    created_at: toISOStringSafe(updated.created_at),
    updated_at: toISOStringSafe(updated.updated_at),
    deleted_at: updated.deleted_at
      ? toISOStringSafe(updated.deleted_at)
      : undefined,
    comments_count,
  };
}
