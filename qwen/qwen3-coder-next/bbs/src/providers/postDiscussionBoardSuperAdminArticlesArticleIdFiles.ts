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
import { SuperadminPayload } from "../decorators/payload/SuperadminPayload";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function postDiscussionBoardSuperAdminArticlesArticleIdFiles(props: {
  superAdmin: SuperadminPayload;
  articleId: string;
  body: IDiscussionBoardArticleFile.ICreate;
}): Promise<IDiscussionBoardArticleFile> {
  const article = await MyGlobal.prisma.discussion_board_articles.findUnique({
    where: { id: props.articleId as string & tags.Format<"uuid"> },
  });
  if (!article) throw new HttpException("Article not found", 404);
  const created = await MyGlobal.prisma.discussion_board_article_files.create({
    data: await DiscussionBoardArticleFileCollector.collect({
      body: props.body,
      discussionBoardArticles: {
        id: props.articleId as string & tags.Format<"uuid">,
      },
    }),
    select: {
      id: true,
      original_name: true,
      stored_path: true,
      file_type: true,
      file_size: true,
      created_at: true,
      updated_at: true,
    },
  });
  return {
    id: created.id as string & tags.Format<"uuid">,
    original_name: created.original_name,
    stored_path: created.stored_path,
    file_type: created.file_type,
    file_size: created.file_size,
    created_at: toISOStringSafe(created.created_at) as string &
      tags.Format<"date-time">,
    updated_at: toISOStringSafe(created.updated_at) as string &
      tags.Format<"date-time">,
  };
}
