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

export async function putShoppingMallCustomerShoppingMallFavoriteSellersId(props: {
  customer: CustomerPayload;
  id: string & tags.Format<"uuid">;
  body: IShoppingMallFavoriteSeller.IUpdate;
}): Promise<IShoppingMallFavoriteSeller> {
  const favoriteSeller =
    await MyGlobal.prisma.shopping_mall_favorite_sellers.findUnique({
      where: { id: props.id },
    });

  if (favoriteSeller === null) {
    throw new HttpException("Favorite seller not found", 404);
  }

  if (favoriteSeller.shopping_mall_customer_id !== props.customer.id) {
    throw new HttpException("Forbidden", 403);
  }

  const updated = await MyGlobal.prisma.shopping_mall_favorite_sellers.update({
    where: { id: props.id },
    data: {
      ...props.body,
      updated_at: new Date(),
    },
  });

  return {
    id: updated.id,
    created_at: toISOStringSafe(updated.created_at),
    updated_at: toISOStringSafe(updated.updated_at),
    customerId: updated.shopping_mall_customer_id,
    sellerId: updated.shopping_mall_seller_id,
    customer: undefined,
    seller: undefined,
  };
}
