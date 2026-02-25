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
import { UserPayload } from "../decorators/payload/UserPayload";
import { DiscussionBoardArticleTagTransformer } from "../transformers/DiscussionBoardArticleTagTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function putDiscussionBoardUserArticlesArticleIdTagsTagId(props: {
  user: UserPayload;
  articleId: string & tags.Format<"uuid">;
  tagId: string & tags.Format<"uuid">;
  body: IDiscussionBoardArticleTag.IUpdate;
}): Promise<IDiscussionBoardArticleTag> {
  // Validate tag name length requirements (1-50 characters)
  if (props.body.tag_name.length < 1 || props.body.tag_name.length > 50) {
    throw new HttpException(
      "Tag name must be between 1 and 50 characters",
      400,
    );
  }
  // Verify article exists and user owns it
  const article = await MyGlobal.prisma.discussion_board_articles.findFirst({
    where: {
      id: props.articleId,
      discussion_board_user_id: props.user.id,
      deleted_at: null,
    },
  });
  if (!article) {
    throw new HttpException("Article not found or access denied", 404);
  }
  // Verify tag association exists and belongs to this article
  const existingTag =
    await MyGlobal.prisma.discussion_board_article_tags.findFirst({
      where: {
        id: props.tagId,
        discussion_board_article_id: props.articleId,
        deleted_at: null,
      },
    });
  if (!existingTag) {
    throw new HttpException("Tag association not found", 404);
  }
  // Check for duplicate tag name on same article (case-insensitive)
  const normalizedNewTagName = props.body.tag_name.trim().toLowerCase();
  const duplicateTag =
    await MyGlobal.prisma.discussion_board_article_tags.findFirst({
      where: {
        discussion_board_article_id: props.articleId,
        tag_name: {
          equals: normalizedNewTagName,
          mode: "insensitive",
        },
        deleted_at: null,
        id: { not: props.tagId },
      },
    });
  if (duplicateTag) {
    throw new HttpException("Tag name already exists for this article", 409);
  }
  // Update the tag
  const result = await MyGlobal.prisma.discussion_board_article_tags.update({
    where: { id: props.tagId },
    data: {
      tag_name: props.body.tag_name.trim(),
      updated_at: new Date(),
    },
    ...DiscussionBoardArticleTagTransformer.select(),
  });
  return await DiscussionBoardArticleTagTransformer.transform(result);
}
