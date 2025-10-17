import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IShoppingMallAddress } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAddress";
import { AdminPayload } from "../decorators/payload/AdminPayload";

export async function getShoppingMallAdminAddressesAddressId(props: {
  admin: AdminPayload;
  addressId: string & tags.Format<"uuid">;
}): Promise<IShoppingMallAddress> {
  const { addressId } = props;

  const address =
    await MyGlobal.prisma.shopping_mall_addresses.findUniqueOrThrow({
      where: {
        id: addressId,
      },
      select: {
        id: true,
        recipient_name: true,
        phone_number: true,
        address_line1: true,
      },
    });

  return {
    id: address.id as string & tags.Format<"uuid">,
    recipient_name: address.recipient_name,
    phone_number: address.phone_number,
    address_line1: address.address_line1,
  };
}
