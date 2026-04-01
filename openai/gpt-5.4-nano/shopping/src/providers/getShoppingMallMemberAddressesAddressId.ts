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
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function getShoppingMallMemberAddressesAddressId(props: {
  member: MemberPayload;
  addressId: string & tags.Format<"uuid">;
}): Promise<IShoppingMallAddress> {
  const record = await MyGlobal.prisma.shopping_mall_addresses.findFirst({
    where: {
      id: props.addressId,
      shopping_mall_customer_id: props.member.id,
      deleted_at: null,
    },
    select: {
      id: true,
      recipient_name: true,
      phone_number: true,
      postal_code: true,
      country: true,
      city: true,
      street_line1: true,
      street_line2: true,
      is_default: true,
      created_at: true,
      updated_at: true,
      deleted_at: true,
    },
  });
  if (record === null) {
    throw new HttpException("Address not found", 404);
  }
  return {
    id: record.id,
    recipientName: record.recipient_name,
    phoneNumber: record.phone_number,
    postalCode: record.postal_code,
    country: record.country,
    city: record.city,
    streetLine1: record.street_line1,
    streetLine2: record.street_line2 ?? null,
    isDefault: record.is_default,
    createdAt: toISOStringSafe(record.created_at),
    updatedAt: toISOStringSafe(record.updated_at),
    deletedAt:
      record.deleted_at === null ? null : toISOStringSafe(record.deleted_at),
  };
}
