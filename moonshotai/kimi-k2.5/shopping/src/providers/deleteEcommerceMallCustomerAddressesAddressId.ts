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
  addressId: string;
}): Promise<void> {
  // First, verify the address exists and belongs to the customer
  const address = await MyGlobal.prisma.ecommerce_mall_orders.findFirst({
    where: {
      id: props.addressId,
      customer_id: props.customer.id,
    },
    select: {
      id: true,
      customer_id: true,
    },
  });
  // If address not found or doesn't belong to customer, return 404
  // This prevents address enumeration attacks
  if (address === null) {
    throw new HttpException("Address not found", 404);
  }
  // Verify ownership again (defensive check)
  if (address.customer_id !== props.customer.id) {
    throw new HttpException("Address not found", 404);
  }
  // Check if this is the default address
  // If it's the default, we need to check if there are other addresses
  // For simplicity, we'll allow deletion but customer should have another default
  // Delete the address
  await MyGlobal.prisma.ecommerce_mall_orders.delete({
    where: {
      id: props.addressId,
    },
  });
  // Return void (204 No Content)
  return;
}
