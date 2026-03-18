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

export async function deleteShoppingMallMemberAddressesAddressId(props: {
  member: MemberPayload;
  addressId: string & tags.Format<"uuid">;
}): Promise<void> {
  await MyGlobal.prisma.$transaction(async (tx) => {
    const address = await tx.shopping_mall_addresses.findUnique({
      where: { id: props.addressId },
      select: {
        id: true,
        shopping_mall_customer_id: true,
        deleted_at: true,
        is_default: true,
      },
    });
    if (address === null || address.deleted_at !== null) {
      throw new HttpException("Address not found", 404);
    }
    if (address.shopping_mall_customer_id !== props.member.id) {
      throw new HttpException("Forbidden", 403);
    }
    await tx.shopping_mall_addresses.delete({
      where: { id: props.addressId },
    });
  });
}
