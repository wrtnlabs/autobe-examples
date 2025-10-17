import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { CustomerPayload } from "../decorators/payload/CustomerPayload";

export async function deleteShoppingMallCustomerAddressesAddressId(props: {
  customer: CustomerPayload;
  addressId: string & tags.Format<"uuid">;
}): Promise<void> {
  const { customer, addressId } = props;

  // Step 1: Find the address and verify it exists and is not already deleted
  const address = await MyGlobal.prisma.shopping_mall_addresses.findFirst({
    where: {
      id: addressId,
      deleted_at: null,
    },
  });

  if (!address) {
    throw new HttpException("Address not found", 404);
  }

  // Step 2: Verify ownership - must be customer's address
  if (
    address.user_type !== "customer" ||
    address.shopping_mall_customer_id !== customer.id
  ) {
    throw new HttpException(
      "Unauthorized: You can only delete your own addresses",
      403,
    );
  }

  // Step 3: Perform soft delete by setting deleted_at timestamp and clearing default flag
  await MyGlobal.prisma.shopping_mall_addresses.update({
    where: { id: addressId },
    data: {
      deleted_at: toISOStringSafe(new Date()),
      is_default: false,
    },
  });
}
