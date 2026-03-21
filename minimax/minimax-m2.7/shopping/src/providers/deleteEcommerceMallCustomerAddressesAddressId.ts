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
  // Find the address - must exist, not deleted, and owned by customer
  const address =
    await MyGlobal.prisma.ecommerce_mall_shipping_addresses.findFirst({
      where: {
        id: props.addressId,
        ecommerce_mall_customer_id: props.customer.id,
        deleted_at: null,
      },
    });
  // If address not found or not owned by customer, return 404
  if (!address) {
    throw new HttpException("Not Found", 404);
  }
  // Delete the address record (cascade handles related records if any)
  await MyGlobal.prisma.ecommerce_mall_shipping_addresses.delete({
    where: {
      id: props.addressId,
    },
  });
}
