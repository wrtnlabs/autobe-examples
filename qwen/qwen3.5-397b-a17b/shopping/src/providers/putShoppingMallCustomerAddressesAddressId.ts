import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IShoppingMallAddress } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAddress";
import { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import { IShoppingMallCustomerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomerProfile";
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
  const existing =
    await MyGlobal.prisma.shopping_mall_addresses.findUniqueOrThrow({
      where: { id: props.addressId },
      select: {
        id: true,
        shopping_mall_customer_id: true,
        is_default: true,
        deleted_at: true,
      },
    });
  if (existing.shopping_mall_customer_id !== props.customer.id) {
    throw new HttpException("Forbidden", 403);
  }
  if (existing.deleted_at !== null) {
    throw new HttpException("Address not found", 404);
  }
  if (props.body.isDefault === true && existing.is_default === false) {
    await MyGlobal.prisma.shopping_mall_addresses.updateMany({
      where: {
        shopping_mall_customer_id: props.customer.id,
        is_default: true,
        deleted_at: null,
      },
      data: {
        is_default: false,
        updated_at: new Date(),
      },
    });
  }
  const updated = await MyGlobal.prisma.shopping_mall_addresses.update({
    where: { id: props.addressId },
    data: {
      ...(props.body.recipientName !== undefined && {
        recipient_name: props.body.recipientName,
      }),
      ...(props.body.recipientPhone !== undefined && {
        recipient_phone: props.body.recipientPhone,
      }),
      ...(props.body.streetAddress !== undefined && {
        street_address: props.body.streetAddress,
      }),
      ...(props.body.city !== undefined && { city: props.body.city }),
      ...(props.body.state !== undefined && { state: props.body.state }),
      ...(props.body.postalCode !== undefined && {
        postal_code: props.body.postalCode,
      }),
      ...(props.body.country !== undefined && { country: props.body.country }),
      ...(props.body.isDefault !== undefined && {
        is_default: props.body.isDefault,
      }),
      updated_at: new Date(),
    },
    ...ShoppingMallAddressTransformer.select(),
  });
  return await ShoppingMallAddressTransformer.transform(updated);
}
