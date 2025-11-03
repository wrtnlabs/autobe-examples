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

export async function postShoppingCustomerCartsCartIdItems(props: {
  customer: CustomerPayload;
  cartId: string & tags.Format<"uuid">;
  body: IShoppingCartItem.ICreate;
}): Promise<IShoppingCartItem> {
  // 1. Validate cart existence and ownership
  const cart = await MyGlobal.prisma.shopping_carts.findUnique({
    where: { id: props.cartId },
    include: { customer: true },
  });
  if (!cart || cart.shopping_customer_id !== props.customer.id) {
    throw new HttpException(
      "Not Found: Cart not found or not owned by this customer",
      404,
    );
  }

  // 2. Validate SKU existence and activity
  const sku = await MyGlobal.prisma.shopping_skus.findFirst({
    where: {
      id: props.body.shopping_sku_id,
      deleted_at: null,
    },
  });
  if (!sku) {
    throw new HttpException("Not Found: SKU does not exist", 404);
  }
  if (
    !sku.is_active ||
    sku.status === "archived" ||
    sku.status === "discontinued"
  ) {
    throw new HttpException("SKU inactive or discontinued", 400);
  }

  // 3. Lookup max quantity per SKU (default=10 if constraint missing or invalid)
  let maxQty = 10;
  const maxQtyConstraint =
    await MyGlobal.prisma.shopping_business_constraints.findFirst({
      where: {
        constraint_name: "max_quantity_per_sku_cart_item",
        active: true,
      },
    });
  if (
    maxQtyConstraint &&
    Number.isSafeInteger(Number(maxQtyConstraint.limit_value)) &&
    Number(maxQtyConstraint.limit_value) > 0
  ) {
    maxQty = Number(maxQtyConstraint.limit_value);
  }

  // 4. Look for existing cart item for SKU
  const existing = await MyGlobal.prisma.shopping_cart_items.findFirst({
    where: {
      shopping_cart_id: props.cartId,
      shopping_sku_id: props.body.shopping_sku_id,
    },
  });

  // 5. Lookup available inventory for SKU (fail if insufficient)
  const inventory = await MyGlobal.prisma.shopping_inventory.findFirst({
    where: {
      shopping_sku_id: props.body.shopping_sku_id,
      deleted_at: null,
    },
  });
  if (!inventory || inventory.quantity <= 0) {
    throw new HttpException("Insufficient stock for this SKU", 400);
  }

  const newQuantity = (existing ? existing.quantity : 0) + props.body.quantity;
  if (newQuantity > inventory.quantity) {
    throw new HttpException("Cannot add more than available stock", 400);
  }
  if (newQuantity > maxQty) {
    throw new HttpException("Exceeds maximum allowed per item in cart", 400);
  }

  // 6. Perform cart item create or update
  const now = toISOStringSafe(new Date());
  let cartItem;
  if (existing) {
    cartItem = await MyGlobal.prisma.shopping_cart_items.update({
      where: { id: existing.id },
      data: {
        quantity: newQuantity,
        updated_at: now,
      },
    });
  } else {
    cartItem = await MyGlobal.prisma.shopping_cart_items.create({
      data: {
        id: v4(),
        shopping_cart_id: props.cartId,
        shopping_sku_id: props.body.shopping_sku_id,
        quantity: props.body.quantity,
        added_at: now,
        updated_at: now,
      },
    });
  }

  // 7. Response mapping for IShoppingCartItem fields
  const skuSummary = {
    id: sku.id,
    sku_code: sku.sku_code,
    price: sku.price,
    is_active: sku.is_active,
    status: sku.status,
  };
  const owner = cart.customer;
  const customerSummary = {
    id: owner.id,
    name: owner.name,
    email: owner.email,
    is_active: owner.is_active,
    created_at: toISOStringSafe(owner.created_at),
    deleted_at: owner.deleted_at ? toISOStringSafe(owner.deleted_at) : null,
  };
  return {
    id: cartItem.id,
    shopping_cart_id: cartItem.shopping_cart_id,
    sku: skuSummary,
    quantity: cartItem.quantity,
    added_at: toISOStringSafe(cartItem.added_at),
    updated_at: toISOStringSafe(cartItem.updated_at),
    cart_owner: customerSummary,
    error_flags: [],
  };
}
