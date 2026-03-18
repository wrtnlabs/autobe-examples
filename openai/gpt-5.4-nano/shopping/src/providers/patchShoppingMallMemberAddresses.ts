import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IShoppingMallAddress } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAddress";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { MemberPayload } from "../decorators/payload/MemberPayload";
import { ShoppingMallAddressTransformer } from "../transformers/ShoppingMallAddressTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchShoppingMallMemberAddresses(props: {
  member: MemberPayload;
  body: IShoppingMallAddress.ICreate;
}): Promise<IShoppingMallAddress> {
  // Prefer id from body if present; otherwise throw because we cannot address which row to patch.
  const addressId = (
    props.body as IShoppingMallAddress.ICreate & {
      id?: string;
    }
  ).id;
  const recipientName = props.body.recipient_name;
  const phoneNumber = props.body.phone_number;
  const postalCode = props.body.postal_code;
  const country = props.body.country;
  const city = props.body.city;
  const streetLine1 = props.body.street_line1;
  const streetLine2 = props.body.street_line2 ?? null;
  const isDefaultRequested = props.body.is_default ?? false;
  if (typeof addressId !== "string" || addressId.trim().length === 0) {
    throw new HttpException("Address id is required", 400);
  }
  if (recipientName.trim().length === 0) {
    throw new HttpException("Recipient name is required", 400);
  }
  if (phoneNumber.trim().length === 0) {
    throw new HttpException("Phone number is required", 400);
  }
  if (postalCode.trim().length === 0) {
    throw new HttpException("Postal code is required", 400);
  }
  if (country.trim().length === 0) {
    throw new HttpException("Country is required", 400);
  }
  if (city.trim().length === 0) {
    throw new HttpException("City is required", 400);
  }
  if (streetLine1.trim().length === 0) {
    throw new HttpException("Street address line1 is required", 400);
  }
  // Ensure the record exists for this member.
  await MyGlobal.prisma.shopping_mall_addresses.findUniqueOrThrow({
    where: {
      shopping_mall_customer_id: {
        shopping_mall_customer_id: props.member.id,
        id: addressId,
      } as any,
    } as any,
    select: ShoppingMallAddressTransformer.select().select,
  });
  const activeCount = await MyGlobal.prisma.shopping_mall_addresses.count({
    where: {
      shopping_mall_customer_id: props.member.id,
      deleted_at: null,
    },
  });
  const shouldSetDefault = isDefaultRequested && activeCount > 0;
  const updatedAt = toISOStringSafe(new Date());
  await MyGlobal.prisma.$transaction(async (prisma) => {
    if (shouldSetDefault) {
      await prisma.shopping_mall_addresses.updateMany({
        where: {
          shopping_mall_customer_id: props.member.id,
          deleted_at: null,
          id: { not: addressId },
        },
        data: { is_default: false, updated_at: new Date(updatedAt) },
      });
    }
    await prisma.shopping_mall_addresses.update({
      where: { id: addressId },
      data: {
        recipient_name: recipientName,
        phone_number: phoneNumber,
        postal_code: postalCode,
        country,
        city,
        street_line1: streetLine1,
        street_line2: streetLine2,
        is_default: shouldSetDefault ? true : false,
        updated_at: new Date(updatedAt),
      },
    });
  });
  const updated =
    await MyGlobal.prisma.shopping_mall_addresses.findUniqueOrThrow({
      where: {
        id: addressId,
        shopping_mall_customer_id: props.member.id,
      } as any,
      ...ShoppingMallAddressTransformer.select(),
    });
  return await ShoppingMallAddressTransformer.transform(updated as any);
}
