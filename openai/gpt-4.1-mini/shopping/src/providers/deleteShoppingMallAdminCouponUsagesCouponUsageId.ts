import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { AdminPayload } from "../decorators/payload/AdminPayload";

export async function deleteShoppingMallAdminCouponUsagesCouponUsageId(props: {
  admin: AdminPayload;
  couponUsageId: string & tags.Format<"uuid">;
}): Promise<void> {
  const existing = await MyGlobal.prisma.shopping_mall_coupon_usages.findUnique(
    {
      where: { id: props.couponUsageId },
    },
  );

  if (!existing) {
    throw new HttpException("Coupon usage record not found", 404);
  }

  // The admin parameter proves authorization; assume caller is authorized
  await MyGlobal.prisma.shopping_mall_coupon_usages.delete({
    where: { id: props.couponUsageId },
  });
}
