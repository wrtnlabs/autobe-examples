import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IShoppingCartItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingCartItem";
import { IShoppingSku } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingSku";
import { IShoppingCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingCustomer";
import { CustomerPayload } from "../decorators/payload/CustomerPayload";

export async function putShoppingCustomerCartsCartIdItemsItemId(props: {
  customer: CustomerPayload;
  cartId: string & tags.Format<"uuid">;
  itemId: string & tags.Format<"uuid">;
  body: IShoppingCartItem.IUpdate;
}): Promise<IShoppingCartItem> {
  const { customer, cartId, itemId, body } = props;
  const maxPerSkuConstraint =
    await MyGlobal.prisma.shopping_business_constraints.findFirst({
      where: { constraint_name: "max_cart_quantity_per_sku", active: true },
    });
  const maxQuantity = maxPerSkuConstraint
    ? Number(maxPerSkuConstraint.limit_value)
    : 10;

  // Find cart item, matching cartId & itemId
  const cartItem = await MyGlobal.prisma.shopping_cart_items.findUnique({
    where: { id: itemId },
  });
  if (!cartItem || cartItem.shopping_cart_id !== cartId) {
    throw new HttpException("Cart item not found", 404);
  }

  // Load cart, check ownership
  const cart = await MyGlobal.prisma.shopping_carts.findUnique({
    where: { id: cartId },
  });
  if (!cart || cart.shopping_customer_id !== customer.id) {
    throw new HttpException("Unauthorized: Not your cart", 403);
  }

  // If quantity 0: delete item & throw 404 (API expects no item returned)
  if (body.quantity === 0) {
    await MyGlobal.prisma.shopping_cart_items.delete({ where: { id: itemId } });
    throw new HttpException("Cart item removed", 404);
  }

  // Validate quantity positive
  if (body.quantity < 1) {
    throw new HttpException("Quantity must be at least 1", 400);
  }
  if (body.quantity > maxQuantity) {
    throw new HttpException(
      `Quantity exceeds platform max per SKU (${maxQuantity})`,
      400,
    );
  }

  // Lookup SKU + summary
  const sku = await MyGlobal.prisma.shopping_skus.findUnique({
    where: { id: cartItem.shopping_sku_id },
  });
  if (
    !sku ||
    sku.deleted_at !== null ||
    !sku.is_active ||
    ["archived", "discontinued", "removed"].includes(sku.status)
  ) {
    throw new HttpException("SKU is not available for cart update", 400);
  }

  // Check inventory
  const inventory = await MyGlobal.prisma.shopping_inventory.findUnique({
    where: { shopping_sku_id: sku.id },
  });
  if (
    !inventory ||
    inventory.deleted_at !== null ||
    inventory.quantity < body.quantity
  ) {
    throw new HttpException("Insufficient stock for requested quantity", 400);
  }

  // Update item
  const now = toISOStringSafe(new Date());
  const updated = await MyGlobal.prisma.shopping_cart_items.update({
    where: { id: itemId },
    data: {
      quantity: body.quantity,
      updated_at: now,
    },
  });

  // Get customer summary
  const customerRec = await MyGlobal.prisma.shopping_customers.findUnique({
    where: { id: cart.shopping_customer_id },
  });
  if (!customerRec) {
    throw new HttpException("Cart owner not found", 404);
  }

  // SKU summary
  const skuSummary = {
    id: sku.id,
    sku_code: sku.sku_code,
    price: sku.price,
    is_active: sku.is_active,
    status: sku.status,
  };

  // Cart owner summary
  const cartOwner = {
    id: customerRec.id,
    name: customerRec.name,
    email: customerRec.email,
    is_active: customerRec.is_active,
    created_at: toISOStringSafe(customerRec.created_at),
    deleted_at: customerRec.deleted_at
      ? toISOStringSafe(customerRec.deleted_at)
      : null,
  };

  // Compose result
  return {
    id: updated.id,
    shopping_cart_id: updated.shopping_cart_id,
    sku: skuSummary,
    quantity: updated.quantity,
    added_at: toISOStringSafe(updated.added_at),
    updated_at: toISOStringSafe(updated.updated_at),
    cart_owner: cartOwner,
    error_flags: undefined,
  };
}
