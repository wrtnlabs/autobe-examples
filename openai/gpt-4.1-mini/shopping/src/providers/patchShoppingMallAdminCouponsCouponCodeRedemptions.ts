import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IShoppingMallCouponRedemption } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCouponRedemption";
import { IPageIShoppingMallCouponRedemption } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallCouponRedemption";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { AdminPayload } from "../decorators/payload/AdminPayload";

export async function patchShoppingMallAdminCouponsCouponCodeRedemptions(props: {
  admin: AdminPayload;
  couponCode: string;
  body: IShoppingMallCouponRedemption.IRequest;
}): Promise<IPageIShoppingMallCouponRedemption.ISummary> {
  const page = props.body.page ?? 1;
  const limit = props.body.limit ?? 10;
  const skip = (page - 1) * limit;

  const validSortByFields = ["redemption_date", "customer_name", "order_id"];
  const sortBy = validSortByFields.includes(
    props.body.sort_by ?? "redemption_date",
  )
    ? props.body.sort_by
    : "redemption_date";
  const order = props.body.order === "asc" ? "asc" : "desc";

  const whereConditions: {
    coupon_code: string;
    customer?: { name: { contains: string } };
    order_id?: string | null;
    redeemed_at?: {
      gte?: string & tags.Format<"date-time">;
      lte?: string & tags.Format<"date-time">;
    };
  } = { coupon_code: props.couponCode };

  if (
    props.body.customer_name !== undefined &&
    props.body.customer_name !== null
  ) {
    whereConditions.customer = { name: { contains: props.body.customer_name } };
  }

  if (props.body.order_id !== undefined) {
    whereConditions.order_id =
      props.body.order_id === null ? null : props.body.order_id;
  }

  if (
    props.body.start_date !== undefined ||
    props.body.end_date !== undefined
  ) {
    whereConditions.redeemed_at = {};
    if (props.body.start_date !== undefined && props.body.start_date !== null) {
      whereConditions.redeemed_at.gte = toISOStringSafe(props.body.start_date);
    }
    if (props.body.end_date !== undefined && props.body.end_date !== null) {
      whereConditions.redeemed_at.lte = toISOStringSafe(props.body.end_date);
    }
    if (
      whereConditions.redeemed_at &&
      Object.keys(whereConditions.redeemed_at).length === 0
    ) {
      delete whereConditions.redeemed_at;
    }
  }

  const totalCount =
    await MyGlobal.prisma.shopping_mall_coupon_redemptions.count({
      where: whereConditions,
    });

  const records =
    await MyGlobal.prisma.shopping_mall_coupon_redemptions.findMany({
      where: whereConditions,
      skip,
      take: limit,
      orderBy: {
        [sortBy === "redemption_date"
          ? "redeemed_at"
          : sortBy === "customer_name"
            ? "customer"
            : "order_id"]: order,
      },
      include: {
        customer: true,
      },
    });

  const data = records.map((record) => ({
    id: record.id,
    coupon_id: record.shopping_mall_coupon_id,
    customer_id: record.shopping_mall_customer_id,
    redeemed_at: toISOStringSafe(record.redeemed_at),
    order_id: record.shopping_mall_order_id ?? null,
  }));

  return {
    pagination: {
      current: page,
      limit: limit,
      records: totalCount,
      pages: Math.ceil(totalCount / limit),
    },
    data,
  };
}
