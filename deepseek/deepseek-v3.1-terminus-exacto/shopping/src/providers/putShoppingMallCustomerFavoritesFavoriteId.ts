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

export async function putShoppingMallCustomerFavoritesFavoriteId(props: {
  customer: CustomerPayload;
  favoriteId: string & tags.Format<"uuid">;
  body: IShoppingMallFavorite.IUpdate;
}): Promise<IShoppingMallFavorite> {
  // Verify the favorite exists and belongs to the customer
  const existingFavorite =
    await MyGlobal.prisma.shopping_mall_favorites.findFirst({
      where: {
        id: props.favoriteId,
        shopping_mall_customer_id: props.customer.id,
        deleted_at: null,
      },
    });

  if (!existingFavorite) {
    throw new HttpException("Favorite not found", 404);
  }

  // Prepare update data
  const updateData: Record<string, unknown> = {
    updated_at: toISOStringSafe(new Date()),
  };

  // Only include provided fields
  if (props.body.notes !== undefined) {
    updateData.notes = props.body.notes;
  }

  if (props.body.tags !== undefined) {
    updateData.tags = props.body.tags;
  }

  // Perform the update
  const updated = await MyGlobal.prisma.shopping_mall_favorites.update({
    where: { id: props.favoriteId },
    data: updateData,
  });

  // Convert dates to ISO strings and return
  return {
    id: updated.id,
    favorited_at: toISOStringSafe(updated.favorited_at),
    updated_at: toISOStringSafe(updated.updated_at),
    deleted_at: updated.deleted_at
      ? toISOStringSafe(updated.deleted_at)
      : undefined,
    shopping_mall_customer_id: updated.shopping_mall_customer_id,
    shopping_mall_product_id: updated.shopping_mall_product_id,
  };
}
