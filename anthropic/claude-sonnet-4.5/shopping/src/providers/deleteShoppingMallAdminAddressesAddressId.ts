import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { AdminPayload } from "../decorators/payload/AdminPayload";

export async function deleteShoppingMallAdminAddressesAddressId(props: {
  admin: AdminPayload;
  addressId: string & tags.Format<"uuid">;
}): Promise<void> {
  const { admin, addressId } = props;

  // Find the address with ownership and deletion status check
  const address = await MyGlobal.prisma.shopping_mall_addresses.findFirst({
    where: {
      id: addressId,
      deleted_at: null,
    },
  });

  if (!address) {
    throw new HttpException("Address not found or already deleted", 404);
  }

  // Verify admin owns this address
  if (address.shopping_mall_admin_id !== admin.id) {
    throw new HttpException(
      "Unauthorized: You can only delete your own addresses",
      403,
    );
  }

  // Perform soft delete by setting deleted_at timestamp
  const now = toISOStringSafe(new Date());
  await MyGlobal.prisma.shopping_mall_addresses.update({
    where: { id: addressId },
    data: {
      deleted_at: now,
      updated_at: now,
    },
  });
}
