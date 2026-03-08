import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IShoppingMallAddress } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAddress";
import { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { CustomerPayload } from "../decorators/payload/CustomerPayload";
import { ShoppingMallAddressTransformer } from "../transformers/ShoppingMallAddressTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function putShoppingMallCustomerAddressesAddressIdDefault(props: {
  customer: CustomerPayload;
  addressId: string & tags.Format<"uuid">;
}): Promise<IShoppingMallAddress> {
  // Find the address to verify ownership and existence
  const address = await MyGlobal.prisma.shopping_mall_addresses.findUnique({
    where: { id: props.addressId },
    select: {
      id: true,
      shopping_mall_customer_id: true,
      deleted_at: true,
    },
  });
  // Address not found
  if (!address) {
    throw new HttpException("Address not found", 404);
  }
  // Ownership check - must belong to authenticated customer
  if (address.shopping_mall_customer_id !== props.customer.id) {
    throw new HttpException("Forbidden", 403);
  }
  // Soft-deleted addresses cannot be set as default
  if (address.deleted_at !== null) {
    throw new HttpException("Address not found", 404);
  }
  // Transaction to atomically update default status
  await MyGlobal.prisma.$transaction([
    // Unset previous default (if any exists)
    MyGlobal.prisma.shopping_mall_addresses.updateMany({
      where: {
        shopping_mall_customer_id: props.customer.id,
        is_default: true,
      },
      data: {
        is_default: false,
        updated_at: new Date(),
      },
    }),
    // Set new default
    MyGlobal.prisma.shopping_mall_addresses.update({
      where: { id: props.addressId },
      data: {
        is_default: true,
        updated_at: new Date(),
      },
    }),
  ]);
  // Fetch and return updated address with full customer relation
  const updated =
    await MyGlobal.prisma.shopping_mall_addresses.findUniqueOrThrow({
      where: { id: props.addressId },
      ...ShoppingMallAddressTransformer.select(),
    });
  return ShoppingMallAddressTransformer.transform(updated);
}
