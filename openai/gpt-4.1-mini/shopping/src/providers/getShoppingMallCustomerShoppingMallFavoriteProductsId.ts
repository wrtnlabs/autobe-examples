import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IShoppingMallFavoriteProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallFavoriteProduct";
import { CustomerPayload } from "../decorators/payload/CustomerPayload";

export async function getShoppingMallCustomerShoppingMallFavoriteProductsId(props: {
  customer: CustomerPayload;
  id: string & tags.Format<"uuid">;
}): Promise<IShoppingMallFavoriteProduct> {
  const favoriteProduct =
    await MyGlobal.prisma.shopping_mall_favorite_products.findUnique({
      where: {
        id: props.id,
        shopping_mall_customer_id: props.customer.id,
      },
    });

  if (!favoriteProduct) {
    throw new HttpException("Favorite product not found", 404);
  }

  return {
    id: favoriteProduct.id,
    shopping_mall_customer_id: favoriteProduct.shopping_mall_customer_id,
    shopping_mall_customer_session_id:
      favoriteProduct.shopping_mall_customer_session_id ?? undefined,
    shopping_mall_product_id: favoriteProduct.shopping_mall_product_id,
    created_at: toISOStringSafe(favoriteProduct.created_at),
    updated_at: toISOStringSafe(favoriteProduct.updated_at),
  };
}
