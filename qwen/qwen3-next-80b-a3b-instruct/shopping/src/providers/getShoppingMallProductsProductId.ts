import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IShoppingMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProduct";

export async function getShoppingMallProductsProductId(props: {
  productId: string & tags.Format<"uuid">;
}): Promise<IShoppingMallProduct> {
  const product = await MyGlobal.prisma.shopping_mall_products.findUnique({
    where: {
      id: props.productId,
      status: "published",
      deleted_at: null,
    },
    include: {
      shopping_mall_product_images: {
        where: {
          is_primary: true,
          deleted_at: null,
        },
        take: 1,
      },
    },
  });

  if (!product) {
    throw new HttpException("Product not found", 404);
  }

  return product.id;
}
