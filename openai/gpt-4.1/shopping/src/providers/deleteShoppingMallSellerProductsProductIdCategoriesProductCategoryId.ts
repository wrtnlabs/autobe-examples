import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { SellerPayload } from "../decorators/payload/SellerPayload";

export async function deleteShoppingMallSellerProductsProductIdCategoriesProductCategoryId(props: {
  seller: SellerPayload;
  productId: string & tags.Format<"uuid">;
  productCategoryId: string & tags.Format<"uuid">;
}): Promise<void> {
  // 1. Find mapping row by mapping ID (props.productCategoryId) and productId.
  const mapping =
    await MyGlobal.prisma.shopping_mall_products_categories.findUnique({
      where: { id: props.productCategoryId },
    });

  // If the mapping does not exist or does not belong to the given product, throw 404.
  if (!mapping || mapping.shopping_mall_product_id !== props.productId) {
    throw new HttpException("Product-category mapping not found", 404);
  }

  // 2. Find the product and verify ownership.
  const product = await MyGlobal.prisma.shopping_mall_products.findUnique({
    where: { id: props.productId },
  });
  if (!product) {
    throw new HttpException("Product not found", 404);
  }
  if (product.shopping_mall_seller_id !== props.seller.id) {
    throw new HttpException(
      "Forbidden: You do not have permission to remove this mapping",
      403,
    );
  }

  // 3. Delete the mapping row.
  await MyGlobal.prisma.shopping_mall_products_categories.delete({
    where: { id: props.productCategoryId },
  });
}
