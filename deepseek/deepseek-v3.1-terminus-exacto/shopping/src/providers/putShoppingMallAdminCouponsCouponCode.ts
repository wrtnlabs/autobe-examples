import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IShoppingMallCoupon } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCoupon";
import { IShoppingMallChannel } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallChannel";
import { IShoppingMallAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdministrator";
import { AdminPayload } from "../decorators/payload/AdminPayload";

export async function putShoppingMallAdminCouponsCouponCode(props: {
  admin: AdminPayload;
  couponCode: string;
  body: IShoppingMallCoupon.IUpdate;
}): Promise<IShoppingMallCoupon> {
  // Find the coupon by code
  const coupon = await MyGlobal.prisma.shopping_mall_coupons.findFirst({
    where: {
      code: props.couponCode,
      deleted_at: null,
    },
  });

  if (!coupon) {
    throw new HttpException("Coupon not found", 404);
  }

  // Verify the admin has permission to update this coupon
  if (coupon.shopping_mall_administrator_id !== props.admin.id) {
    throw new HttpException(
      "Forbidden: You can only update coupons you created",
      403,
    );
  }

  // Validate business logic constraints
  if (
    props.body.valid_from !== undefined &&
    props.body.valid_until !== undefined
  ) {
    if (props.body.valid_from >= props.body.valid_until) {
      throw new HttpException(
        "Valid from date must be before valid until date",
        400,
      );
    }
  }

  if (
    props.body.discount_value !== undefined &&
    props.body.discount_value <= 0
  ) {
    throw new HttpException("Discount value must be positive", 400);
  }

  // Prepare update data with proper null handling
  const updateData: Record<string, unknown> = {
    updated_at: toISOStringSafe(new Date()),
  };

  // Handle channel relationship update
  if (props.body.channel !== undefined) {
    if (props.body.channel === null) {
      updateData.shopping_mall_channel_id = null;
    } else {
      updateData.shopping_mall_channel_id = props.body.channel.id;
    }
  }

  // Add provided fields to update with proper null handling
  const fields = [
    "name",
    "description",
    "discount_type",
    "discount_value",
    "minimum_order_amount",
    "maximum_discount",
    "usage_limit_per_customer",
    "total_usage_limit",
    "valid_from",
    "valid_until",
    "is_active",
  ] as const;

  for (const field of fields) {
    if (props.body[field] !== undefined) {
      updateData[field] = props.body[field] === null ? null : props.body[field];
    }
  }

  // Update the coupon
  const updatedCoupon = await MyGlobal.prisma.shopping_mall_coupons.update({
    where: { id: coupon.id },
    data: updateData,
  });

  // Fetch related data separately
  const [channel, creator] = await Promise.all([
    updatedCoupon.shopping_mall_channel_id
      ? MyGlobal.prisma.shopping_mall_channels.findUnique({
          where: { id: updatedCoupon.shopping_mall_channel_id },
        })
      : null,
    MyGlobal.prisma.shopping_mall_administrators.findUnique({
      where: { id: updatedCoupon.shopping_mall_administrator_id },
    }),
  ]);

  // Return the updated coupon with proper type conversions
  return {
    id: updatedCoupon.id as string & tags.Format<"uuid">,
    code: updatedCoupon.code,
    name: updatedCoupon.name,
    description:
      updatedCoupon.description === null
        ? undefined
        : updatedCoupon.description,
    discount_type: updatedCoupon.discount_type,
    discount_value: updatedCoupon.discount_value,
    minimum_order_amount:
      updatedCoupon.minimum_order_amount === null
        ? undefined
        : updatedCoupon.minimum_order_amount,
    maximum_discount:
      updatedCoupon.maximum_discount === null
        ? undefined
        : updatedCoupon.maximum_discount,
    usage_limit_per_customer:
      updatedCoupon.usage_limit_per_customer === null
        ? undefined
        : updatedCoupon.usage_limit_per_customer,
    total_usage_limit:
      updatedCoupon.total_usage_limit === null
        ? undefined
        : updatedCoupon.total_usage_limit,
    used_count: updatedCoupon.used_count,
    valid_from: toISOStringSafe(updatedCoupon.valid_from),
    valid_until: toISOStringSafe(updatedCoupon.valid_until),
    is_active: updatedCoupon.is_active,
    created_at: toISOStringSafe(updatedCoupon.created_at),
    updated_at: toISOStringSafe(updatedCoupon.updated_at),
    deleted_at:
      updatedCoupon.deleted_at === null
        ? undefined
        : toISOStringSafe(updatedCoupon.deleted_at),
    shopping_mall_channel_id:
      updatedCoupon.shopping_mall_channel_id === null
        ? undefined
        : (updatedCoupon.shopping_mall_channel_id as string &
            tags.Format<"uuid">),
    shopping_mall_administrator_id:
      updatedCoupon.shopping_mall_administrator_id as string &
        tags.Format<"uuid">,
    shopping_mall_administrator_session_id:
      updatedCoupon.shopping_mall_administrator_session_id as string &
        tags.Format<"uuid">,
    channel: channel
      ? {
          id: channel.id as string & tags.Format<"uuid">,
          name: channel.name,
          description:
            channel.description === null ? undefined : channel.description,
          code: channel.code,
        }
      : undefined,
    creator: creator
      ? {
          id: creator.id as string & tags.Format<"uuid">,
          name: `${creator.first_name} ${creator.last_name}`,
          email: creator.email as string & tags.Format<"email">,
          role: creator.role,
        }
      : undefined,
  };
}
