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
import { AdminPayload } from "../decorators/payload/AdminPayload";
import { DiscussionBoardArticleTagTransformer } from "../transformers/DiscussionBoardArticleTagTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function postDiscussionBoardAdminArticlesArticleIdTags(props: {
  admin: AdminPayload;
  articleId: string & tags.Format<"uuid">;
  body: IDiscussionBoardArticleTag.ICreate;
}): Promise<IDiscussionBoardArticleTag> {
  // Verify article exists and is accessible
  const article =
    await MyGlobal.prisma.discussion_board_articles.findUniqueOrThrow({
      where: {
        id: props.articleId,
        deleted_at: null,
      },
    });
  // Normalize tag name (trim whitespace and convert to lowercase)
  const normalizedTagName = props.body.tag_name.trim().toLowerCase();
  // Check if tag name is within allowed length
  if (normalizedTagName.length < 1 || normalizedTagName.length > 50) {
    throw new HttpException(
      "Tag name must be between 1 and 50 characters",
      400,
    );
  }
  // Check for existing duplicate tag on this article
  const existingTag =
    await MyGlobal.prisma.discussion_board_article_tags.findFirst({
      where: {
        discussion_board_article_id: props.articleId,
        tag_name: normalizedTagName,
        deleted_at: null,
      },
    });
  if (existingTag) {
    throw new HttpException("Tag already exists for this article", 400);
  }
  // Enforce maximum 10 tags per article constraint
  const existingTagsCount =
    await MyGlobal.prisma.discussion_board_article_tags.count({
      where: {
        discussion_board_article_id: props.articleId,
        deleted_at: null,
      },
    });
  if (existingTagsCount >= 10) {
    throw new HttpException("Maximum 10 tags allowed per article", 400);
  }
  // Create the tag association using collector
  const tag = await MyGlobal.prisma.discussion_board_article_tags.create({
    data: await DiscussionBoardArticleTagCollector.collect({
      body: { tag_name: normalizedTagName },
      article: { id: props.articleId },
    }),
    ...DiscussionBoardArticleTagTransformer.select(),
  });
  // Return the created tag with complete details
  return DiscussionBoardArticleTagTransformer.transform(tag);
}
