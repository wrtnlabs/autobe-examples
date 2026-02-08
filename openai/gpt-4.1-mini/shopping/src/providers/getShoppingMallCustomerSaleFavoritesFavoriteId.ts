import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IShoppingMallSaleFavorite } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSaleFavorite";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { CustomerPayload } from "../decorators/payload/CustomerPayload";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function getShoppingMallCustomerSaleFavoritesFavoriteId(props: {
  customer: CustomerPayload;
  favoriteId: string & tags.Format<"uuid">;
}): Promise<IShoppingMallSaleFavorite> {
  const record = await MyGlobal.prisma.shopping_mall_sale_favorites.findUnique({
    where: { id: props.favoriteId },
  });
  if (!record) {
    throw new HttpException("Favorite not found", 404);
  }
  if (record.shopping_mall_customer_id !== props.customer.id) {
    throw new HttpException("Forbidden", 403);
  }
  return record;
}
