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

export async function deleteEcommerceCustomerCartsCartItemId(props: {
  customer: CustomerPayload;
  cartItemId: string & tags.Format<"uuid">;
}): Promise<void> {
  const cartItem = await MyGlobal.prisma.ecommerce_cart_items.findUniqueOrThrow(
    {
      where: { id: props.cartItemId, customer_id: props.customer.id },
    },
  );
  const activeOrderItems = await MyGlobal.prisma.ecommerce_order_items.findMany(
    {
      where: {
        productVariantId: cartItem.product_variant_id,
        order: {
          status: { not: "delivered" },
        },
      },
    },
  );
  if (activeOrderItems.length > 0) {
    throw new HttpException(
      "Cart item is part of an active order and cannot be deleted",
      400,
    );
  }
  await MyGlobal.prisma.ecommerce_variant_inventories.create({
    data: {
      id: v4(),
      productVariantId: cartItem.product_variant_id,
      quantity: cartItem.quantity,
      reason: "cart_removed",
      created_at: toISOStringSafe(new Date()),
      updated_at: toISOStringSafe(new Date()),
    },
  });
  await MyGlobal.prisma.ecommerce_cart_items.delete({
    where: { id: props.cartItemId },
  });
  await MyGlobal.prisma.ecommerce_admin_audit_logs.create({
    data: {
      id: v4(),
      actorId: props.customer.id,
      actor_type: "customer",
      action: "delete_cart_item",
      details: `Removed cart item ${props.cartItemId}`,
      created_at: toISOStringSafe(new Date()),
    },
  });
}
