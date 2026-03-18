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

export async function putShoppingMallMemberAddressesAddressId(props: {
  member: MemberPayload;
  addressId: string & tags.Format<"uuid">;
  body: IShoppingMallAddress.IUpdate;
}): Promise<IShoppingMallAddress> {
  const now = toISOStringSafe(new Date());
  const existing =
    await MyGlobal.prisma.shopping_mall_addresses.findUniqueOrThrow({
      where: { id: props.addressId },
      select: {
        id: true,
        shopping_mall_customer_id: true,
        recipient_name: true,
        phone_number: true,
        postal_code: true,
        country: true,
        city: true,
        street_line1: true,
        street_line2: true,
        is_default: true,
        deleted_at: true,
      },
    });
  if (existing.deleted_at !== null) {
    throw new HttpException("Not Found", 404);
  }
  if (existing.shopping_mall_customer_id !== props.member.id) {
    throw new HttpException("Forbidden", 403);
  }
  const recipient_name = props.body.recipient_name ?? existing.recipient_name;
  const phone_number = props.body.phone_number ?? existing.phone_number;
  const postal_code = props.body.postal_code ?? existing.postal_code;
  const country = props.body.country ?? existing.country;
  const city = props.body.city ?? existing.city;
  const street_line1 = props.body.street_line1 ?? existing.street_line1;
  const street_line2 =
    props.body.street_line2 === undefined
      ? existing.street_line2
      : props.body.street_line2;
  const is_default =
    props.body.is_default === undefined
      ? existing.is_default
      : props.body.is_default;
  if (
    recipient_name.length === 0 ||
    phone_number.length === 0 ||
    postal_code.length === 0 ||
    country.length === 0 ||
    city.length === 0 ||
    street_line1.length === 0
  ) {
    throw new HttpException("Bad Request", 400);
  }
  await MyGlobal.prisma.$transaction(async (tx) => {
    if (is_default) {
      await tx.shopping_mall_addresses.updateMany({
        where: {
          shopping_mall_customer_id: props.member.id,
          id: { not: props.addressId },
          deleted_at: null,
          is_default: true,
        },
        data: { is_default: false },
      });
    }
    await tx.shopping_mall_addresses.update({
      where: { id: props.addressId },
      data: {
        recipient_name,
        phone_number,
        postal_code,
        country,
        city,
        street_line1,
        street_line2,
        ...(props.body.is_default !== undefined ? { is_default } : {}),
        updated_at: now,
      },
    });
  });
  const updated =
    await MyGlobal.prisma.shopping_mall_addresses.findUniqueOrThrow({
      where: { id: props.addressId },
      ...ShoppingMallAddressTransformer.select(),
    });
  return await ShoppingMallAddressTransformer.transform(updated);
}
