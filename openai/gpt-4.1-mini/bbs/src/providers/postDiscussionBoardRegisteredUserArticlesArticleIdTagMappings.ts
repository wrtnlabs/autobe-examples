import { IDiscussionBoardArticleTagMapping } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticleTagMapping";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { DiscussionBoardArticleTagMappingCollector } from "../collectors/DiscussionBoardArticleTagMappingCollector";
import { RegistereduserPayload } from "../decorators/payload/RegistereduserPayload";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function postDiscussionBoardRegisteredUserArticlesArticleIdTagMappings(props: {
  registeredUser: RegistereduserPayload;
  articleId: string & tags.Format<"uuid">;
  body: IDiscussionBoardArticleTagMapping.ICreate;
}): Promise<IDiscussionBoardArticleTagMapping> {
  const article = await MyGlobal.prisma.discussion_board_articles.findUnique({
    where: { id: props.articleId },
  });
  if (!article) throw new HttpException("Article not found", 404);
  const tags = await MyGlobal.prisma.discussion_board_tags.findMany({
    where: {
      articleTagMappings: {
        some: { discussion_board_article_id: props.articleId },
      },
    },
    take: 1,
  });
  const tag = tags[0];
  if (!tag) throw new HttpException("Tag not found", 404);
  try {
    const data = await DiscussionBoardArticleTagMappingCollector.collect({
      body: props.body,
      article,
      tag,
    });
    const created = await MyGlobal.prisma.$transaction(async (tx) =>
      tx.discussion_board_article_tag_mappings.create({ data }),
    );
    return {
      id: created.id,
      discussion_board_article_id: created.discussion_board_article_id,
      discussion_board_tag_id: created.discussion_board_tag_id,
      created_at: toISOStringSafe(created.created_at),
      updated_at: toISOStringSafe(created.updated_at),
      deleted_at: created.deleted_at
        ? toISOStringSafe(created.deleted_at)
        : null,
    };
  } catch (error) {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2002"
    ) {
      throw new HttpException("Duplicate article-tag mapping", 409);
    }
    throw error;
  }
}
