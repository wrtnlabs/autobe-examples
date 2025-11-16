import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IShoppingMallArticleComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallArticleComment";

export async function getShoppingMallShoppingMallArticleCategoriesShoppingMallArticleCategoryIdCommentsShoppingMallArticleCommentId(props: {
  shoppingMallArticleCategoryId: string & tags.Format<"uuid">;
  shoppingMallArticleCommentId: string & tags.Format<"uuid">;
}): Promise<IShoppingMallArticleComment> {
  const comment =
    await MyGlobal.prisma.shopping_mall_article_comments.findFirst({
      where: {
        id: props.shoppingMallArticleCommentId,
        shopping_mall_article_id: props.shoppingMallArticleCategoryId,
      },
    });

  if (!comment) {
    throw new HttpException("Article comment not found", 404);
  }

  return {
    id: comment.id,
    shopping_mall_article_category_id: props.shoppingMallArticleCategoryId,
    content: comment.body,
    created_at: toISOStringSafe(comment.created_at),
    updated_at: comment.updated_at ? toISOStringSafe(comment.updated_at) : null,
  };
}
