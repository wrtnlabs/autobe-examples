import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { AdminPayload } from "../decorators/payload/AdminPayload";

export async function deleteShoppingMallAdminCouponsCouponCode(props: {
  admin: AdminPayload;
  couponCode: string;
}): Promise<void> {
  // Use transaction for atomic operation
  await MyGlobal.prisma.$transaction(async (tx) => {
    // First, verify the coupon exists and is not already deleted
    const coupon = await tx.shopping_mall_coupons.findFirst({
      where: {
        code: props.couponCode,
        deleted_at: null,
      },
    });

    if (!coupon) {
      throw new HttpException("Coupon not found or already deleted", 404);
    }

    // Check if coupon is currently active and valid
    const now = toISOStringSafe(new Date());
    if (
      coupon.is_active &&
      toISOStringSafe(coupon.valid_until) > now &&
      toISOStringSafe(coupon.valid_from) <= now
    ) {
      throw new HttpException(
        "Cannot delete active coupon that is currently valid",
        400,
      );
    }

    // Verify admin has permission (in this system, all admins can delete coupons)
    // Additional permission checks could be added here if needed

    // Perform soft deletion by setting deleted_at timestamp
    await tx.shopping_mall_coupons.update({
      where: {
        id: coupon.id,
      },
      data: {
        deleted_at: now,
        updated_at: now,
        is_active: false, // Also deactivate the coupon
      },
    });
  });
}
