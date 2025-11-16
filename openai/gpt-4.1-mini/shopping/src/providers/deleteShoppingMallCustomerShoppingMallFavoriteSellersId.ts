import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { CustomerPayload } from "../decorators/payload/CustomerPayload";

export async function deleteShoppingMallCustomerShoppingMallFavoriteSellersId(props: {
  customer: CustomerPayload;
  id: string & tags.Format<"uuid">;
}): Promise<void> {
  const favoriteSeller =
    await MyGlobal.prisma.shopping_mall_favorite_sellers.findUnique({
      where: { id: props.id },
    });

  if (!favoriteSeller) {
    throw new HttpException("Favorite seller not found", 404);
  }

  if (favoriteSeller.shopping_mall_customer_id !== props.customer.id) {
    throw new HttpException("Forbidden", 403);
  }

  await MyGlobal.prisma.shopping_mall_favorite_sellers.delete({
    where: { id: props.id },
  });
}
