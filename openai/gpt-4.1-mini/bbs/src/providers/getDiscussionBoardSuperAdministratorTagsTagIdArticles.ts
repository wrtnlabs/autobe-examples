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
import { SuperadministratorPayload } from "../decorators/payload/SuperadministratorPayload";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function getDiscussionBoardSuperAdministratorTagsTagIdArticles(props: {
  superAdministrator: SuperadministratorPayload;
  tagId: string & tags.Format<"uuid">;
}): Promise<IPageIDiscussionBoardArticle.ISummary> {
  if (
    !/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
      props.tagId,
    )
  ) {
    throw new HttpException("Invalid tagId format", 400);
  }
  const tag = await MyGlobal.prisma.discussion_board_tags.findUnique({
    where: { id: props.tagId },
  });
  if (tag === null) throw new HttpException("Tag not found", 404);
  const page = 1;
  const limit = 10;
  const skip = (page - 1) * limit;
  const tagMappings =
    await MyGlobal.prisma.discussion_board_article_tag_mappings.findMany({
      where: { discussion_board_tag_id: props.tagId },
      select: { discussion_board_article_id: true },
    });
  if (tagMappings.length === 0) {
    return {
      data: [],
      pagination: {
        current: page,
        limit: limit,
        records: 0,
        pages: 0,
      },
    };
  }
  const articleIds: Array<string & tags.Format<"uuid">> = tagMappings.map(
    (tm) => tm.discussion_board_article_id as string & tags.Format<"uuid">,
  );
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
    },
  });
  const total = await MyGlobal.prisma.discussion_board_articles.count({
    where: {
      id: { in: articleIds },
      deleted_at: null,
    },
  });
  const data = articles.map((article) => ({
    id: article.id as string & tags.Format<"uuid">,
    title: article.title,
    author_id: article.registered_user_id as string & tags.Format<"uuid">,
    section_id: article.section_id as string & tags.Format<"uuid">,
    created_at: toISOStringSafe(article.created_at),
  }));
  return {
    data,
    pagination: {
      current: page,
      limit: limit,
      records: total,
      pages: Math.ceil(total / limit),
    },
  };
}
