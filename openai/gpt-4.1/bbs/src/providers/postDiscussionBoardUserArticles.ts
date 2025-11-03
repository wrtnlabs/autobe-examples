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

export async function postDiscussionBoardUserArticles(props: {
  user: UserPayload;
  body: IDiscussionBoardArticle.ICreate;
}): Promise<IDiscussionBoardArticle> {
  const now = toISOStringSafe(new Date());
  const articleId = v4();

  await MyGlobal.prisma.discussion_board_articles.create({
    data: {
      id: articleId,
      author_user_id: props.user.id,
      title: props.body.title,
      body: props.body.body,
      created_at: now,
      updated_at: now,
      deleted_at: null,
    },
  });

  if (props.body.attachments && props.body.attachments.length > 0) {
    await MyGlobal.prisma.discussion_board_article_attachments.createMany({
      data: props.body.attachments.map((att) => ({
        id: v4(),
        discussion_board_article_id: articleId,
        filename: att.filename,
        kind: att.kind,
        mimetype: att.mimetype,
        filesize: att.filesize,
        virus_scanned: true,
        created_at: now,
        deleted_at: null,
      })),
    });
  }

  const user = await MyGlobal.prisma.discussion_board_users.findUniqueOrThrow({
    where: { id: props.user.id },
    select: {
      id: true,
      display_name: true,
      avatar_url: true,
    },
  });

  const attachments =
    await MyGlobal.prisma.discussion_board_article_attachments.findMany({
      where: {
        discussion_board_article_id: articleId,
        deleted_at: null,
      },
      orderBy: { created_at: "asc" },
    });

  const comments_count =
    await MyGlobal.prisma.discussion_board_article_comments.count({
      where: {
        discussion_board_article_id: articleId,
        deleted_at: null,
      },
    });

  return {
    id: articleId,
    title: props.body.title,
    body: props.body.body,
    author: {
      id: user.id,
      display_name: user.display_name,
      avatar_url: user.avatar_url ?? undefined,
    },
    attachments: attachments.map((a) => ({
      id: a.id,
      discussion_board_article_id: a.discussion_board_article_id,
      filename: a.filename,
      kind: a.kind,
      mimetype: a.mimetype,
      filesize: a.filesize,
      virus_scanned: a.virus_scanned,
      created_at: toISOStringSafe(a.created_at),
      deleted_at: a.deleted_at === null ? null : toISOStringSafe(a.deleted_at),
    })),
    created_at: now,
    updated_at: now,
    deleted_at: null,
    comments_count,
  };
}
