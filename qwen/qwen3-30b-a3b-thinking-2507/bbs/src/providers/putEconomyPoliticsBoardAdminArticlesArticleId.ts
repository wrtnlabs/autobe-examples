import { IEconomyPoliticsBoardArticle } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomyPoliticsBoardArticle";
import { IEconomyPoliticsBoardArticleAttachment } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomyPoliticsBoardArticleAttachment";
import { IEconomyPoliticsBoardArticleTag } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomyPoliticsBoardArticleTag";
import { IEconomyPoliticsBoardSection } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomyPoliticsBoardSection";
import { IEconomyPoliticsBoardUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomyPoliticsBoardUser";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { AdminPayload } from "../decorators/payload/AdminPayload";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function putEconomyPoliticsBoardAdminArticlesArticleId(props: {
  admin: AdminPayload;
  articleId: string & tags.Format<"uuid">;
  body: IEconomyPoliticsBoardArticle.IUpdate;
}): Promise<IEconomyPoliticsBoardArticle> {
  const article =
    await MyGlobal.prisma.economy_politics_board_articles.findUnique({
      where: { id: props.articleId },
    });
  if (!article) {
    throw new HttpException("Article not found", 404);
  }
  const updated = await MyGlobal.prisma.economy_politics_board_articles.update({
    where: { id: props.articleId },
    data: {
      title: props.body.title,
      content: props.body.content,
      updated_at: toISOStringSafe(new Date()),
    },
  });
  return {
    id: updated.id,
    title: updated.title,
    content: updated.content,
    author: updated.author_id,
    section: updated.section_id,
    attachments: [],
    tags: [],
    created_at: toISOStringSafe(updated.created_at),
    updated_at: toISOStringSafe(updated.updated_at),
    deleted_at: updated.deleted_at ? toISOStringSafe(updated.deleted_at) : null,
  } as IEconomyPoliticsBoardArticle;
}
