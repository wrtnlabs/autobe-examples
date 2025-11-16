import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IShoppingMallArticleCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallArticleCategory";
import { SellerPayload } from "../decorators/payload/SellerPayload";

export async function putShoppingMallSellerShoppingMallArticleCategoriesShoppingMallArticleCategoryId(props: {
  seller: SellerPayload;
  shoppingMallArticleCategoryId: string & tags.Format<"uuid">;
  body: IShoppingMallArticleCategory.IUpdate;
}): Promise<IShoppingMallArticleCategory> {
  const existing =
    await MyGlobal.prisma.shopping_mall_article_categories.findUnique({
      where: { id: props.shoppingMallArticleCategoryId },
    });

  if (!existing) {
    throw new HttpException("Article category not found", 404);
  }

  const updated = await MyGlobal.prisma.shopping_mall_article_categories.update(
    {
      where: { id: props.shoppingMallArticleCategoryId },
      data: {
        name: props.body.name ?? undefined,
        description: Object.prototype.hasOwnProperty.call(
          props.body,
          "description",
        )
          ? props.body.description
          : undefined,
        parent_id: Object.prototype.hasOwnProperty.call(props.body, "parent_id")
          ? props.body.parent_id
          : undefined,
        updated_at: toISOStringSafe(new Date()),
      },
    },
  );

  return {
    id: updated.id,
    name: updated.name,
    description: updated.description ?? undefined,
    parent_id: updated.parent_id ?? undefined,
    created_at: toISOStringSafe(updated.created_at),
    updated_at: toISOStringSafe(updated.updated_at),
  };
}
