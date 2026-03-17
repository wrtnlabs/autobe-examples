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
  // Step 1: Find the address, 404 if not found or already deleted
  const address =
    await MyGlobal.prisma.shopping_mall_customer_addresses.findFirstOrThrow({
      where: {
        id: props.addressId,
        deleted_at: null,
      },
      select: {
        id: true,
        shopping_mall_customer_id: true,
      },
    });
  // Step 2: Ownership check — only the owning customer may delete their address
  if (address.shopping_mall_customer_id !== props.customer.id) {
    throw new HttpException("Forbidden", 403);
  }
  // Step 3: Soft-delete the address record
  await MyGlobal.prisma.shopping_mall_customer_addresses.update({
    where: { id: props.addressId },
    data: {
      deleted_at: new Date(),
      updated_at: new Date(),
    },
  });
}
