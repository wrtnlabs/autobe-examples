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

export async function putShoppingMallCustomerAddressesAddressId(props: {
  customer: CustomerPayload;
  addressId: string;
  body: IShoppingMallAddress.IUpdate;
}): Promise<IShoppingMallAddress> {
  // Find address and check ownership
  const address =
    await MyGlobal.prisma.shopping_mall_addresses.findUniqueOrThrow({
      where: { id: props.addressId },
      select: {
        id: true,
        shopping_mall_customer_id: true,
        deleted_at: true,
      },
    });
  // Check if soft-deleted
  if (address.deleted_at !== null) {
    throw new HttpException("Address not found", 404);
  }
  // Validate ownership
  if (address.shopping_mall_customer_id !== props.customer.id) {
    throw new HttpException("Forbidden", 403);
  }
  // If setting is_default to true, unset previous default first
  if (props.body.is_default === true) {
    await MyGlobal.prisma.shopping_mall_addresses.updateMany({
      where: {
        shopping_mall_customer_id: props.customer.id,
        is_default: true,
        id: { not: props.addressId },
      },
      data: {
        is_default: false,
        updated_at: new Date(),
      },
    });
  }
  // Update address
  const updated = await MyGlobal.prisma.shopping_mall_addresses.update({
    where: { id: props.addressId },
    data: {
      ...(props.body.recipient_name !== undefined && {
        recipient_name: props.body.recipient_name,
      }),
      ...(props.body.phone_number !== undefined && {
        phone_number: props.body.phone_number,
      }),
      ...(props.body.street_address !== undefined && {
        street_address: props.body.street_address,
      }),
      ...(props.body.city !== undefined && { city: props.body.city }),
      ...(props.body.state_province !== undefined && {
        state_province: props.body.state_province,
      }),
      ...(props.body.postal_code !== undefined && {
        postal_code: props.body.postal_code,
      }),
      ...(props.body.country !== undefined && { country: props.body.country }),
      ...(props.body.is_default !== undefined && {
        is_default: props.body.is_default,
      }),
      updated_at: new Date(),
    },
    ...ShoppingMallAddressTransformer.select(),
  });
  return await ShoppingMallAddressTransformer.transform(updated);
}
