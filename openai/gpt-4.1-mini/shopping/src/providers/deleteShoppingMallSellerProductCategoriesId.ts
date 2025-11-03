import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { SellerPayload } from "../decorators/payload/SellerPayload";

export async function deleteShoppingMallSellerProductCategoriesId(props: {
  seller: SellerPayload;
  id: string & tags.Format<"uuid">;
}): Promise<void> {
  const category =
    await MyGlobal.prisma.shopping_mall_product_categories.findUnique({
      where: { id: props.id },
    });

  if (category === null) {
    throw new HttpException("Product category not found", 404);
  }

  const dependentProductsCount =
    await MyGlobal.prisma.shopping_mall_products.count({
      where: {
        deleted_at: null,
        shopping_mall_product_skus: {
          some: {
            product: {
              shopping_mall_product_skus: {
                some: { id: props.id },
              },
            },
          },
        },
      },
    });

  if (dependentProductsCount > 0) {
    throw new HttpException(
      "Cannot delete product category with existing products",
      409,
    );
  }

  await MyGlobal.prisma.shopping_mall_product_categories.delete({
    where: { id: props.id },
  });
}
