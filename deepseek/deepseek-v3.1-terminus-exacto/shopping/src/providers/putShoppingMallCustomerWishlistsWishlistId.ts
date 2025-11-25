import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IShoppingMallWishlist } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallWishlist";
import { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import { IShoppingMallWishlistItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallWishlistItem";
import { IShoppingMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProduct";
import { IShoppingMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCategory";
import { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
import { CustomerPayload } from "../decorators/payload/CustomerPayload";

export async function putShoppingMallCustomerWishlistsWishlistId(props: {
  customer: CustomerPayload;
  wishlistId: string & tags.Format<"uuid">;
  body: IShoppingMallWishlist.IUpdate;
}): Promise<IShoppingMallWishlist> {
  // Verify the wishlist exists and belongs to the customer
  const existingWishlist =
    await MyGlobal.prisma.shopping_mall_wishlists.findFirst({
      where: {
        id: props.wishlistId,
        shopping_mall_customer_id: props.customer.id,
        deleted_at: null,
      },
    });

  if (!existingWishlist) {
    throw new HttpException("Wishlist not found", 404);
  }

  // Prepare update data with only provided fields
  const updateData: Record<string, unknown> = {
    updated_at: toISOStringSafe(new Date()),
  };

  // Add only the fields that are provided in the update body
  if (props.body.name !== undefined) {
    updateData.name = props.body.name;
  }

  if (props.body.description !== undefined) {
    updateData.description =
      props.body.description === null ? null : props.body.description;
  }

  if (props.body.is_public !== undefined) {
    updateData.is_public = props.body.is_public;
  }

  if (props.body.priority !== undefined) {
    updateData.priority = props.body.priority;
  }

  if (props.body.status !== undefined) {
    updateData.status = props.body.status;
  }

  // Perform the update
  const updated = await MyGlobal.prisma.shopping_mall_wishlists.update({
    where: { id: props.wishlistId },
    data: updateData,
    include: {
      customer: true,
    },
  });

  // Return the updated wishlist
  return {
    id: updated.id,
    name: updated.name,
    description: updated.description ?? undefined,
    is_public: updated.is_public,
    priority: updated.priority,
    status: updated.status as "active" | "archived" | "shared",
    customer: {
      id: updated.customer.id,
      email: updated.customer.email,
      first_name: updated.customer.first_name,
      last_name: updated.customer.last_name,
      phone_number: updated.customer.phone_number ?? undefined,
      status: updated.customer.status,
      created_at: toISOStringSafe(updated.customer.created_at),
      updated_at: updated.customer.updated_at
        ? toISOStringSafe(updated.customer.updated_at)
        : undefined,
    },
    items: undefined,
    created_at: toISOStringSafe(updated.created_at),
    updated_at: toISOStringSafe(updated.updated_at),
    deleted_at: updated.deleted_at
      ? toISOStringSafe(updated.deleted_at)
      : undefined,
  };
}
