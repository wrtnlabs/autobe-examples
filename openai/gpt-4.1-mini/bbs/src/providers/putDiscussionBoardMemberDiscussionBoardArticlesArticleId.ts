import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IDiscussionBoardArticle } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticle";
import { IDiscussionBoardAttachment } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAttachment";
import { IDiscussionBoardArticleAttachment } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticleAttachment";
import { MemberPayload } from "../decorators/payload/MemberPayload";

export async function putDiscussionBoardMemberDiscussionBoardArticlesArticleId(props: {
  member: MemberPayload;
  articleId: string & tags.Format<"uuid">;
  body: IDiscussionBoardArticle.IUpdate;
}): Promise<IDiscussionBoardArticle> {
  const { member, articleId, body } = props;

  const article =
    await MyGlobal.prisma.discussion_board_articles.findUniqueOrThrow({
      where: { id: articleId },
      include: {
        discussion_board_attachments: {
          where: { deleted_at: null },
        },
      },
    });

  if (article.id !== member.id) {
    throw new HttpException(
      "Forbidden: you can only update your own articles",
      403,
    );
  }

  await MyGlobal.prisma.discussion_board_articles.update({
    where: { id: articleId },
    data: {
      title: body.title ?? undefined,
      content_markdown: body.content_markdown ?? undefined,
      updated_at: toISOStringSafe(new Date()),
    },
  });

  await Promise.all(
    article.discussion_board_attachments.map((att) =>
      MyGlobal.prisma.discussion_board_attachments.update({
        where: { id: att.id },
        data: { deleted_at: toISOStringSafe(new Date()) },
      }),
    ),
  );

  if (body.discussion_board_attachments) {
    await Promise.all(
      body.discussion_board_attachments.map((att) =>
        MyGlobal.prisma.discussion_board_attachments.create({
          data: {
            id: v4(),
            discussion_board_article_id: articleId,
            filename: att.filename!,
            file_type: att.file_type!,
            file_url: att.file_url!,
            created_at: toISOStringSafe(new Date()),
            updated_at: toISOStringSafe(new Date()),
          },
        }),
      ),
    );
  }

  const updatedArticle =
    await MyGlobal.prisma.discussion_board_articles.findUniqueOrThrow({
      where: { id: articleId },
      include: {
        discussion_board_attachments: {
          where: { deleted_at: null },
        },
      },
    });

  return {
    id: updatedArticle.id,
    title: updatedArticle.title,
    content_markdown: updatedArticle.content_markdown,
    created_at: toISOStringSafe(updatedArticle.created_at),
    updated_at: toISOStringSafe(updatedArticle.updated_at),
    deleted_at: updatedArticle.deleted_at
      ? toISOStringSafe(updatedArticle.deleted_at)
      : null,
    discussion_board_attachments:
      updatedArticle.discussion_board_attachments.map((att) => ({
        id: att.id,
        discussion_board_article_id: att.discussion_board_article_id,
        filename: att.filename,
        file_type: att.file_type,
        file_url: att.file_url,
        created_at: toISOStringSafe(att.created_at),
        updated_at: toISOStringSafe(att.updated_at),
        deleted_at: att.deleted_at ? toISOStringSafe(att.deleted_at) : null,
      })),
  };
}
