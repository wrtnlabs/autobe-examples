import { IDiscussionBoardArticle } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticle";
import { IDiscussionBoardArticleTag } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticleTag";
import { IDiscussionBoardSection } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSection";
import { IDiscussionBoardUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardUser";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { DiscussionBoardArticleTagCollector } from "../collectors/DiscussionBoardArticleTagCollector";
import { SuperAdminPayload } from "../decorators/payload/SuperAdminPayload";
import { DiscussionBoardArticleTagTransformer } from "../transformers/DiscussionBoardArticleTagTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function postDiscussionBoardSuperAdminArticlesArticleIdTags(props: {
  superAdmin: SuperAdminPayload;
  articleId: string & tags.Format<"uuid">;
  body: IDiscussionBoardArticleTag.ICreate;
}): Promise<IDiscussionBoardArticleTag> {
  // Verify article exists
  const article =
    await MyGlobal.prisma.discussion_board_articles.findUniqueOrThrow({
      where: { id: props.articleId },
    });
  // Check current tag count (max 10 per article)
  const currentTagCount =
    await MyGlobal.prisma.discussion_board_article_tags.count({
      where: {
        discussion_board_article_id: props.articleId,
        deleted_at: null,
      },
    });
  if (currentTagCount >= 10) {
    throw new HttpException("Maximum of 10 tags per article reached", 400);
  }
  // Normalize tag name
  const normalizedTagName = props.body.tag_name.trim().toLowerCase();
  // Check for duplicate tag on same article
  const existingTag =
    await MyGlobal.prisma.discussion_board_article_tags.findFirst({
      where: {
        discussion_board_article_id: props.articleId,
        tag_name: normalizedTagName,
        deleted_at: null,
      },
    });
  if (existingTag) {
    throw new HttpException("Tag already exists for this article", 409);
  }
  // Create the tag using collector
  const tag = await MyGlobal.prisma.discussion_board_article_tags.create({
    data: await DiscussionBoardArticleTagCollector.collect({
      body: { tag_name: normalizedTagName },
      article: { id: props.articleId },
    }),
    ...DiscussionBoardArticleTagTransformer.select(),
  });
  return await DiscussionBoardArticleTagTransformer.transform(tag);
}
