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
  addressId: string;
}): Promise<void> {
  // 1. Find address (findUniqueOrThrow auto-generates 404 if not found)
  const address =
    await MyGlobal.prisma.shopping_mall_addresses.findUniqueOrThrow({
      where: {
        id: props.addressId,
        deleted_at: null,
      },
      select: {
        id: true,
        shopping_mall_customer_id: true,
        is_default: true,
      },
    });
  // 2. Ownership validation
  if (address.shopping_mall_customer_id !== props.customer.id) {
    throw new HttpException(
      "Cannot delete address belonging to another customer",
      403,
    );
  }
  // 3. Default address check
  if (address.is_default) {
    const otherAddressesCount =
      await MyGlobal.prisma.shopping_mall_addresses.count({
        where: {
          shopping_mall_customer_id: props.customer.id,
          id: { not: props.addressId },
          deleted_at: null,
        },
      });
    if (otherAddressesCount > 0) {
      throw new HttpException(
        "Cannot delete default address while other addresses exist. Please set another address as default first.",
        400,
      );
    }
  }
  // 4. Soft deletion
  await MyGlobal.prisma.shopping_mall_addresses.update({
    where: { id: props.addressId },
    data: {
      deleted_at: new Date(),
      updated_at: new Date(),
      is_default: false,
    },
  });
}
