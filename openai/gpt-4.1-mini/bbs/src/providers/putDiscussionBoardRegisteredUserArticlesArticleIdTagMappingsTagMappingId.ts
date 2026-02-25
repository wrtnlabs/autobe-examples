import { IDiscussionBoardArticle } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticle";
import { IDiscussionBoardArticleTag } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticleTag";
import { IDiscussionBoardArticleTagMapping } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticleTagMapping";
import { IDiscussionBoardRegisteredUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardRegisteredUser";
import { IDiscussionBoardSection } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSection";
import { IDiscussionBoardTag } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardTag";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { RegistereduserPayload } from "../decorators/payload/RegistereduserPayload";
import { DiscussionBoardArticleTagMappingTransformer } from "../transformers/DiscussionBoardArticleTagMappingTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function putDiscussionBoardRegisteredUserArticlesArticleIdTagMappingsTagMappingId(props: {
  registeredUser: RegistereduserPayload;
  articleId: string & tags.Format<"uuid">;
  tagMappingId: string & tags.Format<"uuid">;
  body: IDiscussionBoardArticleTagMapping.IUpdate;
}): Promise<IDiscussionBoardArticleTagMapping> {
  const article =
    await MyGlobal.prisma.discussion_board_articles.findUniqueOrThrow({
      where: { id: props.articleId },
      select: { registered_user_id: true, deleted_at: true },
    });
  if (article.deleted_at !== null) {
    throw new HttpException("Article not found", 404);
  }
  if (article.registered_user_id !== props.registeredUser.id) {
    throw new HttpException("Forbidden", 403);
  }
  const tagMapping =
    await MyGlobal.prisma.discussion_board_article_tag_mappings.findUniqueOrThrow(
      {
        where: { id: props.tagMappingId },
      },
    );
  if (tagMapping.discussion_board_article_id !== props.articleId) {
    throw new HttpException(
      "Tag mapping does not belong to the target article",
      400,
    );
  }
  if (props.body.discussionBoardArticleId !== props.articleId) {
    throw new HttpException(
      "Article ID in body does not match path parameter",
      400,
    );
  }
  const updatedAt = new Date().toISOString() as string &
    tags.Format<"date-time">;
  const updated = await MyGlobal.prisma.$transaction(async (prisma) => {
    await prisma.discussion_board_article_tag_mappings.update({
      where: { id: props.tagMappingId },
      data: {
        discussion_board_article_id: props.body.discussionBoardArticleId,
        discussion_board_tag_id: props.body.discussionBoardTagId,
        updated_at: updatedAt,
      },
    });
    return await prisma.discussion_board_article_tag_mappings.findUniqueOrThrow(
      {
        where: { id: props.tagMappingId },
        ...DiscussionBoardArticleTagMappingTransformer.select(),
      },
    );
  });
  return DiscussionBoardArticleTagMappingTransformer.transform(updated);
} // Note: Need to replace `new Date().toISOString()` without type assertion `as` and without `Date` usage.
