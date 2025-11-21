import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IShoppingMallFavorite } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallFavorite";
import { CustomerPayload } from "../decorators/payload/CustomerPayload";

export async function getShoppingMallCustomerFavoritesFavoriteId(props: {
  customer: CustomerPayload;
  favoriteId: string & tags.Format<"uuid">;
}): Promise<IShoppingMallFavorite> {
  const favorite = await MyGlobal.prisma.shopping_mall_favorites.findFirst({
    where: {
      id: props.favoriteId,
      shopping_mall_customer_id: props.customer.id,
      deleted_at: null,
    },
  });

  if (!favorite) {
    throw new HttpException("Favorite not found", 404);
  }

  return {
    id: favorite.id,
    favorited_at: toISOStringSafe(favorite.favorited_at),
    updated_at: toISOStringSafe(favorite.updated_at),
    deleted_at: favorite.deleted_at
      ? toISOStringSafe(favorite.deleted_at)
      : undefined,
    shopping_mall_customer_id: favorite.shopping_mall_customer_id,
    shopping_mall_product_id: favorite.shopping_mall_product_id,
  };
}
