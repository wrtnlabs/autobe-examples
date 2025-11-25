import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IShoppingMallFavorite } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallFavorite";
import { CustomerPayload } from "../decorators/payload/CustomerPayload";

export async function postShoppingMallCustomerFavorites(props: {
  customer: CustomerPayload;
  body: IShoppingMallFavorite.ICreate;
}): Promise<IShoppingMallFavorite> {
  // Verify the product exists and is active
  const product = await MyGlobal.prisma.shopping_mall_products.findFirst({
    where: {
      id: props.body.shopping_mall_product_id,
      deleted_at: null,
      status: "active",
    },
  });

  if (!product) {
    throw new HttpException("Product not found or not available", 404);
  }

  // Check if favorite already exists for this customer-product combination
  const existingFavorite =
    await MyGlobal.prisma.shopping_mall_favorites.findFirst({
      where: {
        shopping_mall_customer_id: props.customer.id,
        shopping_mall_product_id: props.body.shopping_mall_product_id,
        deleted_at: null,
      },
    });

  if (existingFavorite) {
    throw new HttpException("Product is already in favorites", 400);
  }

  const now = toISOStringSafe(new Date());

  // Create new favorite entry
  const favorite = await MyGlobal.prisma.shopping_mall_favorites.create({
    data: {
      id: v4() as string & tags.Format<"uuid">,
      shopping_mall_customer_id: props.customer.id,
      shopping_mall_product_id: props.body.shopping_mall_product_id,
      favorited_at: now,
      updated_at: now,
      deleted_at: null,
    },
  });

  // Return complete favorite DTO with properly formatted dates
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
