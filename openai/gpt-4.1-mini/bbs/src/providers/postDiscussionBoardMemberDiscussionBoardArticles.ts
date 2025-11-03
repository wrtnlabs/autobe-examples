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
import { MemberPayload } from "../decorators/payload/MemberPayload";

export async function postDiscussionBoardMemberDiscussionBoardArticles(props: {
  member: MemberPayload;
  body: IDiscussionBoardArticle.ICreate;
}): Promise<IDiscussionBoardArticle> {
  const { member, body } = props;

  const now = toISOStringSafe(new Date());

  const attachmentsData =
    body.discussion_board_attachments?.map((attachment) => ({
      id: v4(),
      filename: attachment.filename,
      file_type: attachment.file_type,
      file_url: attachment.file_url,
      created_at: now,
      updated_at: now,
    })) ?? [];

  const createdArticle = await MyGlobal.prisma.discussion_board_articles.create(
    {
      data: {
        id: v4(),
        title: body.title,
        content_markdown: body.content_markdown,
        created_at: now,
        updated_at: now,
        discussion_board_attachments: {
          create: attachmentsData,
        },
      },
      include: {
        discussion_board_attachments: true,
      },
    },
  );

  return {
    id: createdArticle.id,
    title: createdArticle.title,
    content_markdown: createdArticle.content_markdown,
    created_at: now,
    updated_at: now,
    deleted_at: createdArticle.deleted_at
      ? toISOStringSafe(createdArticle.deleted_at)
      : null,
    discussion_board_attachments:
      createdArticle.discussion_board_attachments.map((attachment) => ({
        id: attachment.id,
        discussion_board_article_id: attachment.discussion_board_article_id,
        filename: attachment.filename,
        file_type: attachment.file_type,
        file_url: attachment.file_url,
        created_at: now,
        updated_at: now,
        deleted_at: attachment.deleted_at
          ? toISOStringSafe(attachment.deleted_at)
          : null,
      })),
  };
}
