import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { SellerPayload } from "../decorators/payload/SellerPayload";

export async function deleteShoppingMallSellerProductsProductIdTagsTagId(props: {
  seller: SellerPayload;
  productId: string & tags.Format<"uuid">;
  tagId: string & tags.Format<"uuid">;
}): Promise<void> {
  // Validate product exists and belongs to seller
  const product = await MyGlobal.prisma.shopping_mall_products.findFirst({
    where: {
      id: props.productId,
      shopping_mall_seller_id: props.seller.id,
      deleted_at: null,
    },
  });

  if (!product) {
    throw new HttpException("Product not found or access denied", 404);
  }

  // Delete the product-tag association using the compound key structure as defined in the Prisma schema
  await MyGlobal.prisma.shopping_mall_product_tags_products.delete({
    where: {
      shopping_mall_product_id_shopping_mall_product_tag_id: {
        shopping_mall_product_id: props.productId,
        shopping_mall_product_tag_id: props.tagId,
      },
    },
  });
}
