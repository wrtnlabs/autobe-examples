import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { AdminPayload } from "../decorators/payload/AdminPayload";

export async function deleteShoppingMallAdminProductsProductIdTagsTagId(props: {
  admin: AdminPayload;
  productId: string & tags.Format<"uuid">;
  tagId: string & tags.Format<"uuid">;
}): Promise<void> {
  const existingRelation =
    await MyGlobal.prisma.shopping_mall_product_tags_products.findUnique({
      where: {
        shopping_mall_product_id_shopping_mall_product_tag_id: {
          shopping_mall_product_id: props.productId,
          shopping_mall_product_tag_id: props.tagId,
        },
      },
    });

  if (!existingRelation) {
    throw new HttpException("Product-tag association not found", 404);
  }

  await MyGlobal.prisma.shopping_mall_product_tags_products.delete({
    where: {
      shopping_mall_product_id_shopping_mall_product_tag_id: {
        shopping_mall_product_id: props.productId,
        shopping_mall_product_tag_id: props.tagId,
      },
    },
  });
}
