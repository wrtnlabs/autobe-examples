import { IDiscussionBoardArticleFile } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticleFile";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { DiscussionBoardArticleFileCollector } from "../collectors/DiscussionBoardArticleFileCollector";
import { RegistereduserPayload } from "../decorators/payload/RegistereduserPayload";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function postDiscussionBoardRegisteredUserArticlesArticleIdFiles(props: {
  registeredUser: RegistereduserPayload;
  articleId: string & tags.Format<"uuid">;
  body: IDiscussionBoardArticleFile.ICreate;
}): Promise<IDiscussionBoardArticleFile> {
  const article = await MyGlobal.prisma.discussion_board_articles.findUnique({
    where: { id: props.articleId },
  });
  if (!article) throw new HttpException("Article not found", 404);
  if (article.registered_user_id !== props.registeredUser.id)
    throw new HttpException("Unauthorized", 403);
  const data = await DiscussionBoardArticleFileCollector.collect({
    body: props.body,
    discussionBoardArticles: article,
  });
  const created = await MyGlobal.prisma.discussion_board_article_files.create({
    data,
  });
  function toISOStringSafe(date: Date): string & tags.Format<"date-time"> {
    return date.toISOString() as string & tags.Format<"date-time">;
  }
  return {
    id: created.id as string & tags.Format<"uuid">,
    article_id: created.article_id as string & tags.Format<"uuid">,
    file_name: created.file_name,
    file_type: created.file_type,
    file_size: created.file_size,
    download_url: created.download_url,
    display_order: created.display_order,
    created_at:
      created.created_at instanceof Date
        ? toISOStringSafe(created.created_at)
        : created.created_at,
    updated_at:
      created.updated_at instanceof Date
        ? toISOStringSafe(created.updated_at)
        : created.updated_at,
    deleted_at:
      created.deleted_at instanceof Date
        ? toISOStringSafe(created.deleted_at)
        : created.deleted_at,
  };
}
