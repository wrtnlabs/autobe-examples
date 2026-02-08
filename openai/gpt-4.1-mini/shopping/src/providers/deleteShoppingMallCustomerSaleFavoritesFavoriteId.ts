import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
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

export async function deleteShoppingMallCustomerSaleFavoritesFavoriteId(props: {
  customer: CustomerPayload;
  favoriteId: string & tags.Format<"uuid">;
}): Promise<void> {
  const favorite =
    await MyGlobal.prisma.shopping_mall_sale_favorites.findUnique({
      where: { id: props.favoriteId },
      select: { id: true, shopping_mall_customer_id: true, deleted_at: true },
    });
  if (!favorite || favorite.deleted_at !== null) {
    throw new HttpException("Favorite not found", 404);
  }
  if (favorite.shopping_mall_customer_id !== props.customer.id) {
    throw new HttpException("Forbidden", 403);
  }
  const deletedAt = toISOStringSafe(new Date());
  await MyGlobal.prisma.shopping_mall_sale_favorites.update({
    where: { id: props.favoriteId },
    data: { deleted_at: deletedAt },
  });
}
