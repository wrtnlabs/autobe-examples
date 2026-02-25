import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { AdminPayload } from "../decorators/payload/AdminPayload";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function deleteShoppingMallAdminCarriersCarrierId(props: {
  admin: AdminPayload;
  carrierId: string & tags.Format<"uuid">;
}): Promise<void> {
  const { carrierId } = props;
  // Validate carrier exists and is not already deleted
  const carrier =
    await MyGlobal.prisma.shopping_mall_shipping_carriers.findFirst({
      where: {
        id: carrierId,
        deleted_at: null,
      },
    });
  if (!carrier) {
    throw new HttpException("Carrier not found", 404);
  }
  // Perform soft delete by setting deleted_at
  await MyGlobal.prisma.shopping_mall_shipping_carriers.update({
    where: {
      id: carrierId,
    },
    data: {
      deleted_at: toISOStringSafe(new Date()),
    },
  });
}
