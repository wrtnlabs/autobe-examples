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
  const address =
    await MyGlobal.prisma.shopping_mall_customer_addresses.findUniqueOrThrow({
      where: { id: props.addressId },
      select: {
        id: true,
        is_default: true,
        customerProfile: {
          select: {
            shopping_mall_member_id: true,
          },
        },
      },
    });
  if (address.customerProfile.shopping_mall_member_id !== props.member.id) {
    throw new HttpException("Forbidden", 403);
  }
  if (address.is_default) {
    throw new HttpException(
      "Cannot delete default address. Please set another address as default first.",
      400,
    );
  }
  await MyGlobal.prisma.shopping_mall_customer_addresses.update({
    where: { id: props.addressId },
    data: {
      deleted_at: toISOStringSafe(new Date()),
    },
  });
}
