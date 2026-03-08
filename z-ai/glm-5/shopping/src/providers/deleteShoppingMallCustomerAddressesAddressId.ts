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

export async function deleteShoppingMallCustomerAddressesAddressId(props: {
  customer: CustomerPayload;
  addressId: string & tags.Format<"uuid">;
}): Promise<void> {
  // 1. Fetch the address
  const address = await MyGlobal.prisma.shopping_mall_addresses.findFirst({
    where: {
      id: props.addressId,
      deleted_at: null,
    },
  });
  if (address === null) {
    throw new HttpException("Address not found", 404);
  }
  // 2. Validate ownership
  if (address.shopping_mall_customer_id !== props.customer.id) {
    throw new HttpException("Forbidden", 403);
  }
  // 3. Check for pending orders referencing this address
  const pendingOrders = await MyGlobal.prisma.shopping_mall_orders.count({
    where: {
      shopping_mall_customer_id: props.customer.id,
      status: { in: ["paid", "shipped"] },
      shipping_street_address: address.street_address,
      shipping_city: address.city,
      shipping_state_province: address.state_province,
      shipping_postal_code: address.postal_code,
      shipping_country: address.country,
    },
  });
  if (pendingOrders > 0) {
    throw new HttpException(
      "Cannot delete address while pending orders reference it",
      400,
    );
  }
  // 4. Check default address rules
  if (address.is_default) {
    const otherAddressesCount =
      await MyGlobal.prisma.shopping_mall_addresses.count({
        where: {
          shopping_mall_customer_id: props.customer.id,
          deleted_at: null,
          id: { not: props.addressId },
        },
      });
    if (otherAddressesCount > 0) {
      throw new HttpException(
        "Cannot delete default address while other addresses exist",
        400,
      );
    }
  }
  // 5. Perform soft deletion
  const now = new Date();
  await MyGlobal.prisma.shopping_mall_addresses.update({
    where: { id: props.addressId },
    data: {
      deleted_at: now,
      updated_at: now,
    },
  });
}
