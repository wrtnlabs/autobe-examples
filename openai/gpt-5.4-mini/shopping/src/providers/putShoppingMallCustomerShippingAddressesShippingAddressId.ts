import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IShoppingMallCustomerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomerProfile";
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

export async function putShoppingMallCustomerShippingAddressesShippingAddressId(props: {
  customer: CustomerPayload;
  shippingAddressId: string & tags.Format<"uuid">;
  body: IShoppingMallShippingAddress.IUpdate;
}): Promise<IShoppingMallShippingAddress> {
  const updated = await MyGlobal.prisma.$transaction(async (prisma) => {
    const current =
      await prisma.shopping_mall_shipping_addresses.findUniqueOrThrow({
        where: { id: props.shippingAddressId },
        select: {
          id: true,
          shopping_mall_customer_profile_id: true,
          recipient_name: true,
          phone_number: true,
          street_address: true,
          city: true,
          state_province: true,
          postal_code: true,
          country: true,
          is_default: true,
          deleted_at: true,
        },
      });
    if (current.deleted_at !== null) throw new HttpException("Not Found", 404);
    const candidateRecipientName =
      props.body.recipientName ?? current.recipient_name;
    const candidatePhoneNumber = props.body.phoneNumber ?? current.phone_number;
    const candidateStreetAddress =
      props.body.streetAddress ?? current.street_address;
    const candidateCity = props.body.city ?? current.city;
    const candidateStateProvince =
      props.body.stateProvince ?? current.state_province;
    const candidatePostalCode = props.body.postalCode ?? current.postal_code;
    const candidateCountry = props.body.country ?? current.country;
    const candidateIsDefault = props.body.isDefault ?? current.is_default;
    const duplicate = await prisma.shopping_mall_shipping_addresses.findFirst({
      where: {
        id: { not: props.shippingAddressId },
        shopping_mall_customer_profile_id:
          current.shopping_mall_customer_profile_id,
        deleted_at: null,
        recipient_name: candidateRecipientName,
        phone_number: candidatePhoneNumber,
        street_address: candidateStreetAddress,
        city: candidateCity,
        state_province: candidateStateProvince,
        postal_code: candidatePostalCode,
        country: candidateCountry,
      },
      select: { id: true },
    });
    if (duplicate !== null) throw new HttpException("Conflict", 409);
    if (candidateIsDefault) {
      await prisma.shopping_mall_shipping_addresses.updateMany({
        where: {
          shopping_mall_customer_profile_id:
            current.shopping_mall_customer_profile_id,
          id: { not: props.shippingAddressId },
          deleted_at: null,
          is_default: true,
        },
        data: {
          is_default: false,
        },
      });
    }
    await prisma.shopping_mall_shipping_addresses.update({
      where: { id: props.shippingAddressId },
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
        ...(props.body.country !== undefined && {
          country: props.body.country,
        }),
        ...(props.body.isDefault !== undefined && {
          is_default: props.body.isDefault,
        }),
        updated_at: new Date(),
      },
    });
    const result =
      await prisma.shopping_mall_shipping_addresses.findUniqueOrThrow({
        where: { id: props.shippingAddressId },
        ...ShoppingMallShippingAddressTransformer.select(),
      });
    return result;
  });
  return await ShoppingMallShippingAddressTransformer.transform(updated);
}
