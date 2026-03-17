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

export async function deleteEcommerceMallCustomerAddressesAddressId(props: {
  customer: CustomerPayload;
  addressId: string & tags.Format<"uuid">;
}): Promise<void> {
  // 1. Find the address and verify ownership
  const address = await MyGlobal.prisma.ecommerce_mall_addresses.findUnique({
    where: { id: props.addressId },
    select: {
      id: true,
      ecommerce_mall_customer_id: true,
      is_default: true,
      deleted_at: true,
      recipient_name: true,
      phone_number: true,
      street_address: true,
      city: true,
      state_province: true,
      postal_code: true,
      country: true,
    },
  });
  // 2. Verify address exists
  if (!address) {
    throw new HttpException("Address not found", 404);
  }
  // 3. Verify ownership
  if (address.ecommerce_mall_customer_id !== props.customer.id) {
    throw new HttpException("Forbidden", 403);
  }
  // 4. Check if already deleted
  if (address.deleted_at !== null) {
    throw new HttpException("Address not found", 404);
  }
  // 5. Check if default address
  if (address.is_default === true) {
    throw new HttpException(
      "Cannot delete default address. Please set a different default address first.",
      400,
    );
  }
  // 6. Check if associated with active orders
  const activeOrders = await MyGlobal.prisma.ecommerce_mall_orders.count({
    where: {
      ecommerce_mall_customer_id: props.customer.id,
      shipping_recipient_name: address.recipient_name,
      shipping_phone_number: address.phone_number,
      shipping_street_address: address.street_address,
      shipping_city: address.city,
      shipping_state: address.state_province,
      shipping_postal_code: address.postal_code,
      shipping_country: address.country,
      status: { in: ["paid", "shipped", "partiallyCompleted"] },
      deleted_at: null,
    },
  });
  if (activeOrders > 0) {
    throw new HttpException(
      "Cannot delete address associated with active orders",
      400,
    );
  }
  // 7. Count remaining addresses
  const remainingAddresses =
    await MyGlobal.prisma.ecommerce_mall_addresses.count({
      where: {
        ecommerce_mall_customer_id: props.customer.id,
        deleted_at: null,
      },
    });
  if (remainingAddresses <= 1) {
    throw new HttpException(
      "Cannot delete last address. Please add a new address first.",
      400,
    );
  }
  // 8. Perform soft delete
  await MyGlobal.prisma.ecommerce_mall_addresses.update({
    where: { id: props.addressId },
    data: {
      deleted_at: new Date(),
    },
  });
}
