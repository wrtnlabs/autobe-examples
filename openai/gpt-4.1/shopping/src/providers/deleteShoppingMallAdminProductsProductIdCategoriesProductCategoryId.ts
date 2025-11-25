import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { AdminPayload } from "../decorators/payload/AdminPayload";

export async function deleteShoppingMallAdminProductsProductIdCategoriesProductCategoryId(props: {
  admin: AdminPayload;
  productId: string & tags.Format<"uuid">;
  productCategoryId: string & tags.Format<"uuid">;
}): Promise<void> {
  // Check that the mapping exists with both productCategoryId (id PK) and productId (shopping_mall_product_id)
  const mapping =
    await MyGlobal.prisma.shopping_mall_products_categories.findUnique({
      where: { id: props.productCategoryId },
    });
  if (!mapping || mapping.shopping_mall_product_id !== props.productId) {
    throw new HttpException("Product-category mapping not found.", 404);
  }
  // Remove the row permanently
  await MyGlobal.prisma.shopping_mall_products_categories.delete({
    where: { id: props.productCategoryId },
  });
}
