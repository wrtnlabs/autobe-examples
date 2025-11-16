import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IShoppingMallFavoriteSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallFavoriteSeller";
import { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
import { CustomerPayload } from "../decorators/payload/CustomerPayload";

export async function getShoppingMallCustomerShoppingMallFavoriteSellersFavoriteSellerId(props: {
  customer: CustomerPayload;
  favoriteSellerId: string & tags.Format<"uuid">;
}): Promise<IShoppingMallFavoriteSeller> {
  const favoriteSellerRecord =
    await MyGlobal.prisma.shopping_mall_favorite_sellers.findUnique({
      where: { id: props.favoriteSellerId },
      include: {
        customer: true,
        seller: true,
      },
    });

  if (favoriteSellerRecord === null) {
    throw new HttpException("Favorite seller not found", 404);
  }

  if (favoriteSellerRecord.shopping_mall_customer_id !== props.customer.id) {
    throw new HttpException("Forbidden", 403);
  }

  return {
    id: favoriteSellerRecord.id,
    created_at: toISOStringSafe(favoriteSellerRecord.created_at),
    updated_at: toISOStringSafe(favoriteSellerRecord.updated_at),
    customerId:
      favoriteSellerRecord.shopping_mall_customer_id satisfies string as string,
    sellerId:
      favoriteSellerRecord.shopping_mall_seller_id satisfies string as string,
    customer: undefined,
    seller: favoriteSellerRecord.seller
      ? {
          id: favoriteSellerRecord.seller.id,
          name: favoriteSellerRecord.seller.name,
          email: favoriteSellerRecord.seller.email,
          status: typia.assert<"active" | "inactive" | "suspended">(
            favoriteSellerRecord.seller.status,
          ),
          business_status: typia.assert<"approved" | "pending" | "rejected">(
            favoriteSellerRecord.seller.business_status,
          ),
          created_at: toISOStringSafe(favoriteSellerRecord.seller.created_at),
          updated_at: toISOStringSafe(favoriteSellerRecord.seller.updated_at),
          deleted_at:
            favoriteSellerRecord.seller.deleted_at !== null
              ? toISOStringSafe(favoriteSellerRecord.seller.deleted_at)
              : null,
        }
      : undefined,
  };
}
