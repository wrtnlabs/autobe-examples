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
import { UserPayload } from "../decorators/payload/UserPayload";
import { DiscussionBoardArticleTagTransformer } from "../transformers/DiscussionBoardArticleTagTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function postDiscussionBoardUserArticlesArticleIdTags(props: {
  user: UserPayload;
  articleId: string & tags.Format<"uuid">;
  body: IDiscussionBoardArticleTag.ICreate;
}): Promise<IDiscussionBoardArticleTag> {
  // Validate article exists and belongs to user
  const article =
    await MyGlobal.prisma.discussion_board_articles.findFirstOrThrow({
      where: {
        id: props.articleId,
        discussion_board_user_id: props.user.id,
        deleted_at: null,
      },
    });
  // Check maximum 10 tags per article
  const existingTagCount =
    await MyGlobal.prisma.discussion_board_article_tags.count({
      where: {
        discussion_board_article_id: props.articleId,
        deleted_at: null,
      },
    });
  if (existingTagCount >= 10) {
    throw new HttpException("Maximum of 10 tags per article reached", 400);
  }
  // Normalize tag name
  const normalizedTagName = props.body.tag_name.trim().toLowerCase();
  // Check for duplicate tag
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
  // Create new tag using collector
  const tag = await MyGlobal.prisma.discussion_board_article_tags.create({
    data: await DiscussionBoardArticleTagCollector.collect({
      body: { tag_name: normalizedTagName },
      article: { id: props.articleId },
    }),
    ...DiscussionBoardArticleTagTransformer.select(),
  });
  return await DiscussionBoardArticleTagTransformer.transform(tag);
}
