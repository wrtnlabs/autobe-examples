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

export async function putShoppingMallAdminAddressesAddressId(props: {
  admin: AdminPayload;
  addressId: string & tags.Format<"uuid">;
  body: IShoppingMallAddress.IUpdate;
}): Promise<IShoppingMallAddress> {
  const { admin, addressId, body } = props;

  const address =
    await MyGlobal.prisma.shopping_mall_addresses.findUniqueOrThrow({
      where: { id: addressId },
    });

  if (address.shopping_mall_admin_id !== admin.id) {
    throw new HttpException(
      "Unauthorized: You can only update your own addresses",
      403,
    );
  }

  const updated = await MyGlobal.prisma.shopping_mall_addresses.update({
    where: { id: addressId },
    data: {
      recipient_name: body.recipient_name ?? undefined,
      city: body.city ?? undefined,
      updated_at: toISOStringSafe(new Date()),
    },
  });

  return {
    id: updated.id as string & tags.Format<"uuid">,
    recipient_name: updated.recipient_name,
    phone_number: updated.phone_number,
    address_line1: updated.address_line1,
  };
}
