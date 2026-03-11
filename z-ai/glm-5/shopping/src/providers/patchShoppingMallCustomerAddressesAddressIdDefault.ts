import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IShoppingMallAddress } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAddress";
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

export async function patchShoppingMallCustomerAddressesAddressIdDefault(props: {
  customer: {
    id: string & tags.Format<"uuid">;
    session_id: string & tags.Format<"uuid">;
    type: "customer";
  };
  addressId: string;
}): Promise<IShoppingMallAddress> {
  // Retrieve the address and verify it exists and is not deleted
  const address = await MyGlobal.prisma.shopping_mall_addresses.findUnique({
    where: { id: props.addressId },
    select: {
      id: true,
      shopping_mall_customer_id: true,
      deleted_at: true,
    },
  });
  if (address === null || address.deleted_at !== null) {
    throw new HttpException("Address not found", 404);
  }
  // Verify ownership
  if (address.shopping_mall_customer_id !== props.customer.id) {
    throw new HttpException("Forbidden", 403);
  }
  // Atomically update default status in a transaction
  await MyGlobal.prisma.$transaction([
    // Remove default from all customer's addresses
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
    // Set target address as default
    MyGlobal.prisma.shopping_mall_addresses.update({
      where: { id: props.addressId },
      data: {
        is_default: true,
        updated_at: new Date(),
      },
    }),
  ]);
  // Retrieve and return the updated address
  const updated =
    await MyGlobal.prisma.shopping_mall_addresses.findUniqueOrThrow({
      where: { id: props.addressId },
      ...ShoppingMallAddressTransformer.select(),
    });
  return await ShoppingMallAddressTransformer.transform(updated);
}
