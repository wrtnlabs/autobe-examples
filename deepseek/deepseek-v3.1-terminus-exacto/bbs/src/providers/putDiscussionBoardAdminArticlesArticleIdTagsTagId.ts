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
import { AdminPayload } from "../decorators/payload/AdminPayload";
import { DiscussionBoardArticleTagTransformer } from "../transformers/DiscussionBoardArticleTagTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function putDiscussionBoardAdminArticlesArticleIdTagsTagId(props: {
  admin: AdminPayload;
  articleId: string & tags.Format<"uuid">;
  tagId: string & tags.Format<"uuid">;
  body: IDiscussionBoardArticleTag.IUpdate;
}): Promise<IDiscussionBoardArticleTag> {
  // Validate tag name format and constraints
  if (!props.body.tag_name || props.body.tag_name.trim().length === 0) {
    throw new HttpException("Tag name cannot be empty", 400);
  }
  const normalizedTagName = props.body.tag_name.trim();
  if (normalizedTagName.length > 50) {
    throw new HttpException("Tag name must be 50 characters or less", 400);
  }
  if (normalizedTagName.length < 1) {
    throw new HttpException("Tag name must be at least 1 character", 400);
  }
  // Verify the article exists
  await MyGlobal.prisma.discussion_board_articles.findUniqueOrThrow({
    where: { id: props.articleId, deleted_at: null },
  });
  // Validate tag name conflict for the same article
  const existingTag =
    await MyGlobal.prisma.discussion_board_article_tags.findFirst({
      where: {
        discussion_board_article_id: props.articleId,
        tag_name: normalizedTagName,
        deleted_at: null,
        NOT: { id: props.tagId },
      },
    });
  if (existingTag) {
    throw new HttpException(
      `Tag name '${normalizedTagName}' already exists for this article`,
      400,
    );
  }
  // Verify the target tag association exists
  await MyGlobal.prisma.discussion_board_article_tags.findUniqueOrThrow({
    where: {
      id: props.tagId,
      discussion_board_article_id: props.articleId,
      deleted_at: null,
    },
  });
  // Update the tag name
  const updated = await MyGlobal.prisma.discussion_board_article_tags.update({
    where: {
      id: props.tagId,
      deleted_at: null,
    },
    data: {
      tag_name: normalizedTagName,
      updated_at: new Date(),
    },
    ...DiscussionBoardArticleTagTransformer.select(),
  });
  return await DiscussionBoardArticleTagTransformer.transform(updated);
}
