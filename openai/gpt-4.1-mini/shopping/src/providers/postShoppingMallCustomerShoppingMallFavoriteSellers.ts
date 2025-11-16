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

export async function postShoppingMallCustomerShoppingMallFavoriteSellers(props: {
  customer: CustomerPayload;
  body: IShoppingMallFavoriteSeller.ICreate;
}): Promise<IShoppingMallFavoriteSeller> {
  const exists = await MyGlobal.prisma.shopping_mall_favorite_sellers.findFirst(
    {
      where: {
        shopping_mall_customer_id: props.customer.id,
        shopping_mall_seller_id: props.body.seller_id,
      },
    },
  );

  if (exists !== null) {
    throw new HttpException("Favorite seller already exists", 409);
  }

  const now = toISOStringSafe(new Date()) as string & tags.Format<"date-time">;

  const created = await MyGlobal.prisma.shopping_mall_favorite_sellers.create({
    data: {
      id: v4() as string & tags.Format<"uuid">,
      shopping_mall_customer_id: props.customer.id,
      shopping_mall_seller_id: props.body.seller_id,
      created_at: now,
      updated_at: now,
    },
  });

  return {
    id: created.id,
    customerId: created.shopping_mall_customer_id,
    sellerId: created.shopping_mall_seller_id,
    created_at: toISOStringSafe(created.created_at) as string &
      tags.Format<"date-time">,
    updated_at: toISOStringSafe(created.updated_at) as string &
      tags.Format<"date-time">,
    customer: undefined,
    seller: undefined,
  };
}
