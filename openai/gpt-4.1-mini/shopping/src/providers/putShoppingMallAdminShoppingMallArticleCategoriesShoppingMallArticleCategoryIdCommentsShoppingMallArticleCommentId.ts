import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IShoppingMallArticleComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallArticleComment";
import { AdminPayload } from "../decorators/payload/AdminPayload";

export async function putShoppingMallAdminShoppingMallArticleCategoriesShoppingMallArticleCategoryIdCommentsShoppingMallArticleCommentId(props: {
  admin: AdminPayload;
  shoppingMallArticleCategoryId: string;
  shoppingMallArticleCommentId: string;
  body: IShoppingMallArticleComment.IUpdate;
}): Promise<IShoppingMallArticleComment> {
  const category =
    await MyGlobal.prisma.shopping_mall_article_categories.findUnique({
      where: { id: props.shoppingMallArticleCategoryId },
    });

  if (!category) {
    throw new HttpException("Article category not found", 404);
  }

  const comment =
    await MyGlobal.prisma.shopping_mall_article_comments.findUnique({
      where: { id: props.shoppingMallArticleCommentId },
    });

  if (
    !comment ||
    comment.shopping_mall_article_id !== props.shoppingMallArticleCategoryId
  ) {
    throw new HttpException("Article comment not found", 404);
  }

  const updated = await MyGlobal.prisma.shopping_mall_article_comments.update({
    where: { id: props.shoppingMallArticleCommentId },
    data: {
      body: props.body.content ?? undefined,
      updated_at: toISOStringSafe(new Date()),
    },
  });

  return {
    id: updated.id,
    shopping_mall_article_category_id: category.id,
    content: props.body.content ?? "",
    created_at: toISOStringSafe(updated.created_at),
    updated_at: toISOStringSafe(updated.updated_at),
  };
}
