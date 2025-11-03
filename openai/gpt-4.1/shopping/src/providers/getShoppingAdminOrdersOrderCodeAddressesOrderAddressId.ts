import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IShoppingOrderAddress } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingOrderAddress";
import { AdminPayload } from "../decorators/payload/AdminPayload";

export async function getShoppingAdminOrdersOrderCodeAddressesOrderAddressId(props: {
  admin: AdminPayload;
  orderCode: string;
  orderAddressId: string & tags.Format<"uuid">;
}): Promise<IShoppingOrderAddress> {
  // Step 1: Lookup order by order_code
  const order = await MyGlobal.prisma.shopping_orders.findUnique({
    where: { order_code: props.orderCode },
    select: { id: true },
  });
  if (!order) {
    throw new HttpException("Order not found", 404);
  }

  // Step 2: Lookup address by id and shopping_order_id
  const address = await MyGlobal.prisma.shopping_order_addresses.findFirst({
    where: {
      id: props.orderAddressId,
      shopping_order_id: order.id,
    },
  });
  if (!address) {
    throw new HttpException("Order address not found", 404);
  }

  // Step 3: Return mapped IShoppingOrderAddress
  return {
    id: address.id,
    shopping_order_id: address.shopping_order_id,
    type: address.type,
    recipient_name: address.recipient_name,
    recipient_phone: address.recipient_phone,
    zip_code: address.zip_code,
    base_address: address.base_address,
    detail_address: address.detail_address ?? undefined,
    city: address.city,
    state_province: address.state_province,
    country: address.country,
    created_at: toISOStringSafe(address.created_at),
    updated_at: toISOStringSafe(address.updated_at),
  };
}
