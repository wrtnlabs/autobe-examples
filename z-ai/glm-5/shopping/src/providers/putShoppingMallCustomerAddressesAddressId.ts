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

export async function putShoppingMallCustomerAddressesAddressId(props: {
  customer: CustomerPayload;
  addressId: string & tags.Format<"uuid">;
  body: IShoppingMallAddress.IUpdate;
}): Promise<IShoppingMallAddress> {
  // Find address and verify ownership + not soft-deleted
  const address =
    await MyGlobal.prisma.shopping_mall_addresses.findUniqueOrThrow({
      where: {
        id: props.addressId,
        shopping_mall_customer_id: props.customer.id,
        deleted_at: null,
      },
      select: { id: true },
    });
  // Handle default address logic - unset other addresses first
  if (props.body.isDefault === true) {
    await MyGlobal.prisma.shopping_mall_addresses.updateMany({
      where: {
        shopping_mall_customer_id: props.customer.id,
        id: { not: props.addressId },
        deleted_at: null,
      },
      data: { is_default: false, updated_at: toISOStringSafe(new Date()) },
    });
  }
  // Update address with partial fields
  await MyGlobal.prisma.shopping_mall_addresses.update({
    where: { id: props.addressId },
    data: {
      ...(props.body.recipientName !== undefined && {
        recipient_name: props.body.recipientName,
      }),
      ...(props.body.phoneNumber !== undefined && {
        phone_number: props.body.phoneNumber,
      }),
      ...(props.body.streetAddress !== undefined && {
        street_address: props.body.streetAddress,
      }),
      ...(props.body.city !== undefined && { city: props.body.city }),
      ...(props.body.stateProvince !== undefined && {
        state_province: props.body.stateProvince,
      }),
      ...(props.body.postalCode !== undefined && {
        postal_code: props.body.postalCode,
      }),
      ...(props.body.country !== undefined && { country: props.body.country }),
      ...(props.body.isDefault !== undefined && {
        is_default: props.body.isDefault,
      }),
      updated_at: toISOStringSafe(new Date()),
    },
  });
  // Fetch and return transformed result
  const updated =
    await MyGlobal.prisma.shopping_mall_addresses.findUniqueOrThrow({
      where: { id: props.addressId },
      ...ShoppingMallAddressTransformer.select(),
    });
  return await ShoppingMallAddressTransformer.transform(updated);
}
