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
  const recipientName = props.body.recipient_name;
  const phoneNumber = props.body.phone_number;
  const postalCode = props.body.postal_code;
  const country = props.body.country;
  const city = props.body.city;
  const streetLine1 = props.body.street_line1;
  const streetLine2 = props.body.street_line2 ?? null;
  if (
    recipientName.trim().length === 0 ||
    phoneNumber.trim().length === 0 ||
    postalCode.trim().length === 0 ||
    country.trim().length === 0 ||
    city.trim().length === 0 ||
    streetLine1.trim().length === 0
  ) {
    throw new HttpException("Incomplete required address fields", 400);
  }
  const requestedIsDefault = props.body.is_default;
  const shouldSetIsDefault = requestedIsDefault !== undefined;
  return await MyGlobal.prisma.$transaction(async (tx) => {
    const address = await tx.shopping_mall_addresses.findFirstOrThrow({
      where: {
        shopping_mall_customer_id: props.member.id,
        deleted_at: null,
      },
      select: {
        id: true,
        is_default: true,
      },
      orderBy: {
        is_default: "desc",
        id: "asc",
      },
    });
    await tx.shopping_mall_addresses.update({
      where: { id: address.id },
      data: {
        recipient_name: recipientName,
        phone_number: phoneNumber,
        postal_code: postalCode,
        country,
        city,
        street_line1: streetLine1,
        street_line2: streetLine2,
        ...(shouldSetIsDefault && {
          is_default: requestedIsDefault ?? false,
        }),
      },
    });
    const activeCount = await tx.shopping_mall_addresses.count({
      where: {
        shopping_mall_customer_id: props.member.id,
        deleted_at: null,
      },
    });
    if (activeCount === 0) {
      await tx.shopping_mall_addresses.updateMany({
        where: {
          shopping_mall_customer_id: props.member.id,
          deleted_at: null,
        },
        data: { is_default: false },
      });
    } else if (shouldSetIsDefault && requestedIsDefault === true) {
      await tx.shopping_mall_addresses.updateMany({
        where: {
          shopping_mall_customer_id: props.member.id,
          deleted_at: null,
          id: {
            not: address.id,
          },
        },
        data: { is_default: false },
      });
      await tx.shopping_mall_addresses.update({
        where: { id: address.id },
        data: { is_default: true },
      });
    }
    const updated = await tx.shopping_mall_addresses.findFirstOrThrow({
      where: {
        id: address.id,
        shopping_mall_customer_id: props.member.id,
        deleted_at: null,
      },
      ...ShoppingMallAddressTransformer.select(),
    });
    return await ShoppingMallAddressTransformer.transform(updated);
  });
}
