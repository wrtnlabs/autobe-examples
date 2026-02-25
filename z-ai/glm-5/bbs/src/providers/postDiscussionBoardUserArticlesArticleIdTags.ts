import { IDiscussionBoardArticle } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticle";
import { IDiscussionBoardArticleFile } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticleFile";
import { IDiscussionBoardArticleImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticleImage";
import { IDiscussionBoardArticleTag } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticleTag";
import { IDiscussionBoardSection } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSection";
import { IDiscussionBoardTag } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardTag";
import { IDiscussionBoardUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardUser";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { UserPayload } from "../decorators/payload/UserPayload";
import { DiscussionBoardArticleTransformer } from "../transformers/DiscussionBoardArticleTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function postDiscussionBoardUserArticlesArticleIdTags(props: {
  user: UserPayload;
  articleId: string & tags.Format<"uuid">;
  body: IDiscussionBoardArticleTag.ICreate;
}): Promise<IDiscussionBoardArticle> {
  // 1. Article Lookup & Authorization
  const article =
    await MyGlobal.prisma.discussion_board_articles.findUniqueOrThrow({
      where: { id: props.articleId },
      select: { id: true, discussion_board_user_id: true, deleted_at: true },
    });
  if (article.deleted_at !== null) {
    throw new HttpException("Article not found", 404);
  }
  if (article.discussion_board_user_id !== props.user.id) {
    throw new HttpException("Forbidden", 403);
  }
  // 2. Ban Status Check
  const user = await MyGlobal.prisma.discussion_board_users.findUniqueOrThrow({
    where: { id: props.user.id },
    select: { is_banned: true },
  });
  if (user.is_banned) {
    throw new HttpException("User is banned", 403);
  }
  // 3. Tag Processing
  const normalizedValue = props.body.value.trim().toLowerCase();
  if (normalizedValue.length < 1 || normalizedValue.length > 50) {
    throw new HttpException("Tag must be 1-50 characters", 400);
  }
  if (!/^[a-z0-9_-]+$/.test(normalizedValue)) {
    throw new HttpException(
      "Tag can only contain alphanumeric characters, hyphens, and underscores",
      400,
    );
  }
  // 4. Tag Limit Check
  const currentTagCount =
    await MyGlobal.prisma.discussion_board_article_tags.count({
      where: { discussion_board_article_id: props.articleId },
    });
  if (currentTagCount >= 15) {
    throw new HttpException("Maximum 15 tags per article", 400);
  }
  // 5. Tag Resolution
  let tag = await MyGlobal.prisma.discussion_board_tags.findUnique({
    where: { value: normalizedValue },
    select: { id: true, value: true },
  });
  if (tag === null) {
    tag = await MyGlobal.prisma.discussion_board_tags.create({
      data: {
        id: v4(),
        value: normalizedValue,
        created_at: new Date(),
        updated_at: new Date(),
      },
      select: { id: true, value: true },
    });
  }
  // 6. Check existing association
  const existingAssociation =
    await MyGlobal.prisma.discussion_board_article_tags.findUnique({
      where: {
        discussion_board_article_id_discussion_board_tag_id: {
          discussion_board_article_id: props.articleId,
          discussion_board_tag_id: tag.id,
        },
      },
      select: { id: true },
    });
  if (existingAssociation === null) {
    await MyGlobal.prisma.discussion_board_article_tags.create({
      data: {
        id: v4(),
        discussion_board_article_id: props.articleId,
        discussion_board_tag_id: tag.id,
        created_at: new Date(),
      },
    });
  }
  // 7. Return updated article
  const updatedArticle =
    await MyGlobal.prisma.discussion_board_articles.findUniqueOrThrow({
      where: { id: props.articleId },
      ...DiscussionBoardArticleTransformer.select(),
    });
  return await DiscussionBoardArticleTransformer.transform(updatedArticle);
}
