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

export async function postShoppingMallCustomerShippingAddresses(props: {
  customer: CustomerPayload;
  body: IShoppingMallShippingAddress.ICreate;
}): Promise<IShoppingMallShippingAddress> {
  const recipientName: string = props.body.recipient_name.trim();
  const phoneNumber: string = props.body.phone_number.trim();
  const streetAddress: string = props.body.street_address.trim();
  const city: string = props.body.city.trim();
  const stateProvince: string = props.body.state_province.trim();
  const postalCode: string = props.body.postal_code.trim();
  const country: string = props.body.country.trim();
  if (
    recipientName.length === 0 ||
    phoneNumber.length === 0 ||
    streetAddress.length === 0 ||
    city.length === 0 ||
    stateProvince.length === 0 ||
    postalCode.length === 0 ||
    country.length === 0
  ) {
    throw new HttpException("Missing required shipping details", 400);
  }
  if (props.body.is_default === true) {
    await MyGlobal.prisma.shopping_mall_shipping_addresses.updateMany({
      where: {
        shopping_mall_customer_id: props.customer.id,
        deleted_at: null,
        is_default: true,
      },
      data: {
        is_default: false,
        updated_at: new Date(),
      },
    });
  }
  const created = await MyGlobal.prisma.shopping_mall_shipping_addresses.create(
    {
      data: {
        id: v4(),
        recipient_name: recipientName,
        phone_number: phoneNumber,
        street_address: streetAddress,
        city,
        state_province: stateProvince,
        postal_code: postalCode,
        country,
        is_default: props.body.is_default ?? false,
        created_at: new Date(),
        updated_at: new Date(),
        deleted_at: null,
        customer: {
          connect: {
            id: props.customer.id,
          },
        },
      },
      ...ShoppingMallShippingAddressTransformer.select(),
    },
  );
  return await ShoppingMallShippingAddressTransformer.transform(created);
}
