import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IShoppingOrderAddress } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingOrderAddress";
import { SellerPayload } from "../decorators/payload/SellerPayload";

export async function getShoppingSellerOrdersOrderCodeAddressesOrderAddressId(props: {
  seller: SellerPayload;
  orderCode: string;
  orderAddressId: string & tags.Format<"uuid">;
}): Promise<IShoppingOrderAddress> {
  // Find the target order by order_code
  const order = await MyGlobal.prisma.shopping_orders.findFirst({
    where: {
      order_code: props.orderCode,
      deleted_at: null,
    },
    select: { id: true },
  });
  if (!order) {
    throw new HttpException("Order not found", 404);
  }

  // Find the address, enforcing it belongs to the order
  const address = await MyGlobal.prisma.shopping_order_addresses.findFirst({
    where: {
      id: props.orderAddressId,
      shopping_order_id: order.id,
    },
  });
  if (!address) {
    throw new HttpException("Order address not found", 404);
  }

  return {
    id: address.id,
    shopping_order_id: address.shopping_order_id,
    type: address.type,
    recipient_name: address.recipient_name,
    recipient_phone: address.recipient_phone,
    zip_code: address.zip_code,
    base_address: address.base_address,
    detail_address:
      address.detail_address === null ? undefined : address.detail_address,
    city: address.city,
    state_province: address.state_province,
    country: address.country,
    created_at: toISOStringSafe(address.created_at),
    updated_at: toISOStringSafe(address.updated_at),
  };
}
