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
import { SuperAdminPayload } from "../decorators/payload/SuperAdminPayload";
import { DiscussionBoardArticleTagTransformer } from "../transformers/DiscussionBoardArticleTagTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function putDiscussionBoardSuperAdminArticlesArticleIdTagsTagId(props: {
  superAdmin: SuperAdminPayload;
  articleId: string & tags.Format<"uuid">;
  tagId: string & tags.Format<"uuid">;
  body: IDiscussionBoardArticleTag.IUpdate;
}): Promise<IDiscussionBoardArticleTag> {
  // Verify article exists and is not deleted
  await MyGlobal.prisma.discussion_board_articles.findUniqueOrThrow({
    where: { id: props.articleId, deleted_at: null },
  });
  // Validate tag name format and length
  const normalizedTagName = props.body.tag_name.trim();
  if (normalizedTagName.length === 0 || normalizedTagName.length > 50) {
    throw new HttpException(
      "Tag name must be between 1 and 50 characters",
      400,
    );
  }
  // Check if tag association exists and is not deleted
  const existingTagAssociation =
    await MyGlobal.prisma.discussion_board_article_tags.findUnique({
      where: {
        id: props.tagId,
        discussion_board_article_id: props.articleId,
        deleted_at: null,
      },
    });
  if (!existingTagAssociation) {
    throw new HttpException(
      "Tag association not found or has been deleted",
      404,
    );
  }
  // Check for duplicate tag name on same article (excluding current tag)
  const duplicateTag =
    await MyGlobal.prisma.discussion_board_article_tags.findFirst({
      where: {
        discussion_board_article_id: props.articleId,
        tag_name: normalizedTagName.toLowerCase(),
        id: { not: props.tagId },
        deleted_at: null,
      },
    });
  if (duplicateTag) {
    throw new HttpException("Tag name already exists for this article", 400);
  }
  // Update the tag with current timestamp
  const currentTime = new Date().toISOString();
  const updated = await MyGlobal.prisma.discussion_board_article_tags.update({
    where: {
      id: props.tagId,
      discussion_board_article_id: props.articleId,
      deleted_at: null,
    },
    data: {
      tag_name: normalizedTagName,
      updated_at: new Date(currentTime),
    },
    ...DiscussionBoardArticleTagTransformer.select(),
  });
  return await DiscussionBoardArticleTagTransformer.transform(updated);
}
