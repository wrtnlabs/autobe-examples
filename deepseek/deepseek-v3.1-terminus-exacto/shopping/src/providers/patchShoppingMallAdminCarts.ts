import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IShoppingMallCart } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCart";
import { IPageIShoppingMallCart } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallCart";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { AdminPayload } from "../decorators/payload/AdminPayload";

export async function patchShoppingMallAdminCarts(props: {
  admin: AdminPayload;
  body: IShoppingMallCart.IRequest;
}): Promise<IPageIShoppingMallCart.ISummary> {
  const page = props.body.page;
  const limit = props.body.limit;
  const skip = (page - 1) * limit;

  // Build where condition
  const where: Prisma.shopping_mall_cartsWhereInput = {
    deleted_at: null,
  };

  // Apply filters
  if (props.body.status !== undefined && props.body.status !== null) {
    where.status = props.body.status;
  }

  // Handle date range filters without using Date constructor
  if (
    props.body.created_at_start !== undefined ||
    props.body.created_at_end !== undefined
  ) {
    where.created_at = {};
    if (props.body.created_at_start !== undefined) {
      where.created_at.gte = props.body.created_at_start;
    }
    if (props.body.created_at_end !== undefined) {
      where.created_at.lte = props.body.created_at_end;
    }
  }

  if (
    props.body.expires_at_start !== undefined ||
    props.body.expires_at_end !== undefined
  ) {
    where.expires_at = {};
    if (props.body.expires_at_start !== undefined) {
      where.expires_at.gte = props.body.expires_at_start;
    }
    if (props.body.expires_at_end !== undefined) {
      where.expires_at.lte = props.body.expires_at_end;
    }
  }

  if (
    props.body.shipping_method !== undefined &&
    props.body.shipping_method !== null
  ) {
    where.shipping_method = props.body.shipping_method;
  }

  if (
    props.body.applied_coupon_code !== undefined &&
    props.body.applied_coupon_code !== null
  ) {
    where.applied_coupon_code = props.body.applied_coupon_code;
  }

  if (
    props.body.customer_session_id !== undefined &&
    props.body.customer_session_id !== null
  ) {
    where.shopping_mall_customer_session_id = props.body.customer_session_id;
  }

  // Execute queries concurrently
  const [data, total] = await Promise.all([
    MyGlobal.prisma.shopping_mall_carts.findMany({
      where,
      skip,
      take: limit,
      orderBy: { created_at: "desc" },
    }),
    MyGlobal.prisma.shopping_mall_carts.count({ where }),
  ]);

  // Convert to summary format
  const cartSummaries: IShoppingMallCart.ISummary[] = data.map((cart) => ({
    id: cart.id,
    status: cart.status,
    expires_at: toISOStringSafe(cart.expires_at),
    applied_coupon_code: cart.applied_coupon_code ?? undefined,
    shipping_method: cart.shipping_method ?? undefined,
    estimated_shipping_cost: cart.estimated_shipping_cost ?? undefined,
    created_at: toISOStringSafe(cart.created_at),
    updated_at: toISOStringSafe(cart.updated_at),
  }));

  return {
    pagination: {
      current: page,
      limit: limit,
      records: total,
      pages: Math.ceil(total / limit),
    },
    data: cartSummaries,
  };
}
