import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
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

export async function postShoppingMallMemberAddressesAddressIdLockForCheckout(props: {
  member: MemberPayload;
  addressId: string & tags.Format<"uuid">;
}): Promise<void> {
  const nowIso = toISOStringSafe(new Date());
  await MyGlobal.prisma.$transaction(async (tx) => {
    const address = await tx.shopping_mall_addresses.findUniqueOrThrow({
      where: { id: props.addressId },
      select: {
        id: true,
        shopping_mall_customer_id: true,
        deleted_at: true,
        recipient_name: true,
        phone_number: true,
        postal_code: true,
        city: true,
        country: true,
        street_line1: true,
        street_line2: true,
      },
    });
    if (address.shopping_mall_customer_id !== props.member.id) {
      throw new HttpException("Forbidden", 403);
    }
    if (address.deleted_at !== null) {
      throw new HttpException(
        "Address is not eligible for checkout selection",
        409,
      );
    }
    await tx.shopping_mall_address_snapshots.create({
      data: {
        id: v4() as unknown as string & tags.Format<"uuid">,
        shopping_mall_address_id: address.id,
        recipient_name: address.recipient_name,
        recipient_phone: address.phone_number,
        postal_code: address.postal_code,
        region_line1: address.city,
        region_line2: address.country,
        street_address_line1: address.street_line1,
        street_address_line2: address.street_line2 ?? "",
        created_at: new Date(nowIso),
        updated_at: new Date(nowIso),
        deleted_at: null,
      },
    });
  });
}
