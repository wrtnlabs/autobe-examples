import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { CustomerPayload } from "../decorators/payload/CustomerPayload";

export async function deleteShoppingMallCustomerFavoritesFavoriteId(props: {
  customer: CustomerPayload;
  favoriteId: string & tags.Format<"uuid">;
}): Promise<void> {
  // Verify the favorite exists and belongs to the customer
  const favorite = await MyGlobal.prisma.shopping_mall_favorites.findFirst({
    where: {
      id: props.favoriteId,
      shopping_mall_customer_id: props.customer.id,
      deleted_at: null,
    },
  });

  if (!favorite) {
    throw new HttpException("Favorite not found or access denied", 404);
  }

  // Perform soft delete by setting deleted_at timestamp
  await MyGlobal.prisma.shopping_mall_favorites.update({
    where: { id: props.favoriteId },
    data: {
      deleted_at: toISOStringSafe(new Date()),
      updated_at: toISOStringSafe(new Date()),
    },
  });
}
