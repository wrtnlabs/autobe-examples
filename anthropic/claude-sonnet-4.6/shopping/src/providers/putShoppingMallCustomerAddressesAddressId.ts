import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IShoppingMallCustomerAddress } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomerAddress";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { CustomerPayload } from "../decorators/payload/CustomerPayload";
import { ShoppingMallCustomerAddressTransformer } from "../transformers/ShoppingMallCustomerAddressTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function putShoppingMallCustomerAddressesAddressId(props: {
  customer: CustomerPayload;
  addressId: string & tags.Format<"uuid">;
  body: IShoppingMallCustomerAddress.IUpdate;
}): Promise<IShoppingMallCustomerAddress> {
  // 1. Look up the address ensuring it exists and is not soft-deleted
  const existing =
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
  // 2. Ownership check — must belong to the authenticated customer
  if (existing.shopping_mall_customer_id !== props.customer.id) {
    throw new HttpException("Forbidden", 403);
  }
  // 3. Perform update — if is_default=true, clear other defaults in a transaction
  if (props.body.isDefault === true) {
    await MyGlobal.prisma.$transaction(async (tx) => {
      // Clear is_default on all other active addresses for this customer
      await tx.shopping_mall_customer_addresses.updateMany({
        where: {
          shopping_mall_customer_id: props.customer.id,
          id: { not: props.addressId },
          deleted_at: null,
          is_default: true,
        },
        data: {
          is_default: false,
          updated_at: new Date(),
        },
      });
      // Update the target address
      await tx.shopping_mall_customer_addresses.update({
        where: { id: props.addressId },
        data: {
          recipient_name: props.body.recipientName,
          phone: props.body.phone,
          address_line1: props.body.addressLine1,
          address_line2: props.body.addressLine2 ?? null,
          city: props.body.city,
          state: props.body.state,
          postal_code: props.body.postalCode,
          country: props.body.country,
          is_default: props.body.isDefault,
          updated_at: new Date(),
        },
      });
    });
  } else {
    await MyGlobal.prisma.shopping_mall_customer_addresses.update({
      where: { id: props.addressId },
      data: {
        recipient_name: props.body.recipientName,
        phone: props.body.phone,
        address_line1: props.body.addressLine1,
        address_line2: props.body.addressLine2 ?? null,
        city: props.body.city,
        state: props.body.state,
        postal_code: props.body.postalCode,
        country: props.body.country,
        is_default: props.body.isDefault,
        updated_at: new Date(),
      },
    });
  }
  // 4. Fetch and return the updated record using the transformer
  const updated =
    await MyGlobal.prisma.shopping_mall_customer_addresses.findUniqueOrThrow({
      where: { id: props.addressId },
      ...ShoppingMallCustomerAddressTransformer.select(),
    });
  return ShoppingMallCustomerAddressTransformer.transform(updated);
}
