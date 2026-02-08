import { IDiscussionBoardArticle } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticle";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageIDiscussionBoardArticle } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardArticle";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { AdministratorPayload } from "../decorators/payload/AdministratorPayload";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function getDiscussionBoardAdministratorTagsTagIdArticles(props: {
  administrator: AdministratorPayload;
  tagId: string & tags.Format<"uuid">;
}): Promise<IPageIDiscussionBoardArticle.ISummary> {
  const tag = await MyGlobal.prisma.discussion_board_tags.findUnique({
    where: { id: props.tagId },
    select: { id: true },
  });
  if (!tag) throw new HttpException("Tag not found", 404);
  const page = 1;
  const limit = 20;
  const skip = (page - 1) * limit;
  const articleTagMappings =
    await MyGlobal.prisma.discussion_board_article_tag_mappings.findMany({
      where: { discussion_board_tag_id: props.tagId },
      select: { discussion_board_article_id: true },
    });
  const articleIds =
    articleTagMappings.length > 0
      ? articleTagMappings.map((mapping) => mapping.discussion_board_article_id)
      : [""];
  const articles = await MyGlobal.prisma.discussion_board_articles.findMany({
    where: {
      id: { in: articleIds },
      deleted_at: null,
    },
    skip,
    take: limit,
    orderBy: { created_at: "desc" },
    select: {
      id: true,
      title: true,
      registered_user_id: true,
      section_id: true,
      created_at: true,
      updated_at: true,
    },
  });
  const total = await MyGlobal.prisma.discussion_board_articles.count({
    where: {
      id: { in: articleIds },
      deleted_at: null,
    },
  });
  const data = articles.map((article) => {
    const id: string & tags.Format<"uuid"> = article.id;
    const title: string = article.title;
    const author_id: string & tags.Format<"uuid"> = article.registered_user_id;
    const section_id: string & tags.Format<"uuid"> = article.section_id;
    const created_at: string & tags.Format<"date-time"> = toISOStringSafe(
      article.created_at,
    );
    const updated_at: string & tags.Format<"date-time"> = toISOStringSafe(
      article.updated_at,
    );
    return { id, title, author_id, section_id, created_at, updated_at };
  });
  return {
    pagination: {
      current: page,
      limit,
      records: total,
      pages: Math.ceil(total / limit),
    },
    data,
  };
}
