import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IShoppingMallShippingAddress } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallShippingAddress";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { CustomerPayload } from "../decorators/payload/CustomerPayload";
import { ShoppingMallShippingAddressTransformer } from "../transformers/ShoppingMallShippingAddressTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function putShoppingMallCustomerShippingAddressesAddressId(props: {
  customer: CustomerPayload;
  addressId: string & tags.Format<"uuid">;
  body: IShoppingMallShippingAddress.IUpdate;
}): Promise<IShoppingMallShippingAddress> {
  const address =
    await MyGlobal.prisma.shopping_mall_shipping_addresses.findFirstOrThrow({
      where: {
        id: props.addressId,
        deleted_at: null,
      },
      select: {
        id: true,
        shopping_mall_customer_id: true,
      },
    });
  if (address.shopping_mall_customer_id !== props.customer.id) {
    throw new HttpException("Forbidden", 403);
  }
  const updatedAt: string & tags.Format<"date-time"> = typia.assert<
    string & tags.Format<"date-time">
  >(new globalThis.Date().toISOString());
  if (props.body.is_default === true) {
    await MyGlobal.prisma.$transaction(async (prisma) => {
      await prisma.shopping_mall_shipping_addresses.updateMany({
        where: {
          shopping_mall_customer_id: props.customer.id,
          deleted_at: null,
          id: {
            not: props.addressId,
          },
        },
        data: {
          is_default: false,
          updated_at: updatedAt,
        },
      });
      await prisma.shopping_mall_shipping_addresses.update({
        where: {
          id: props.addressId,
        },
        data: {
          recipient_name: props.body.recipient_name,
          phone_number: props.body.phone_number,
          street_address: props.body.street_address,
          city: props.body.city,
          state_province: props.body.state_province,
          postal_code: props.body.postal_code,
          country: props.body.country,
          is_default: true,
          updated_at: updatedAt,
        },
      });
    });
  } else {
    await MyGlobal.prisma.shopping_mall_shipping_addresses.update({
      where: {
        id: props.addressId,
      },
      data: {
        recipient_name: props.body.recipient_name,
        phone_number: props.body.phone_number,
        street_address: props.body.street_address,
        city: props.body.city,
        state_province: props.body.state_province,
        postal_code: props.body.postal_code,
        country: props.body.country,
        is_default: false,
        updated_at: updatedAt,
      },
    });
  }
  const updated =
    await MyGlobal.prisma.shopping_mall_shipping_addresses.findFirstOrThrow({
      where: {
        id: props.addressId,
        deleted_at: null,
      },
      ...ShoppingMallShippingAddressTransformer.select(),
    });
  return await ShoppingMallShippingAddressTransformer.transform(updated);
}
