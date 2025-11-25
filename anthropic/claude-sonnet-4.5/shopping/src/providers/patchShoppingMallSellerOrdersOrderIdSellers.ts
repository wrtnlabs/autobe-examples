import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IShoppingMallOrderSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrderSeller";
import { IPageIShoppingMallOrderSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallOrderSeller";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
import { SellerPayload } from "../decorators/payload/SellerPayload";

export async function patchShoppingMallSellerOrdersOrderIdSellers(props: {
  seller: SellerPayload;
  orderId: string & tags.Format<"uuid">;
  body: IShoppingMallOrderSeller.IRequest;
}): Promise<IPageIShoppingMallOrderSeller.ISummary> {
  const page = props.body.page ?? 1;
  const limit = props.body.limit ?? 20;
  const skip = (page - 1) * limit;

  const whereCondition: Record<string, unknown> = {
    shopping_mall_order_id: props.orderId,
    shopping_mall_seller_id: props.seller.id,
    deleted_at: null,
  };

  if (props.body.search) {
    whereCondition.OR = [
      { seller: { business_name: { contains: props.body.search } } },
      { seller: { store_name: { contains: props.body.search } } },
      { carrier_name: { contains: props.body.search } },
      { tracking_number: { contains: props.body.search } },
    ];
  }

  if (props.body.seller_id) {
    whereCondition.shopping_mall_seller_id = props.body.seller_id;
  }

  if (props.body.status) {
    whereCondition.status = props.body.status;
  }

  if (
    props.body.min_subtotal !== undefined ||
    props.body.max_subtotal !== undefined
  ) {
    whereCondition.subtotal = {};
    if (props.body.min_subtotal !== undefined) {
      (whereCondition.subtotal as Record<string, unknown>).gte =
        props.body.min_subtotal;
    }
    if (props.body.max_subtotal !== undefined) {
      (whereCondition.subtotal as Record<string, unknown>).lte =
        props.body.max_subtotal;
    }
  }

  if (props.body.shipping_method) {
    whereCondition.shipping_method = props.body.shipping_method;
  }

  if (props.body.tracking_number) {
    whereCondition.tracking_number = props.body.tracking_number;
  }

  if (props.body.carrier_name) {
    whereCondition.carrier_name = props.body.carrier_name;
  }

  if (props.body.shipped_after || props.body.shipped_before) {
    whereCondition.shipped_at = {};
    if (props.body.shipped_after) {
      (whereCondition.shipped_at as Record<string, unknown>).gte =
        props.body.shipped_after;
    }
    if (props.body.shipped_before) {
      (whereCondition.shipped_at as Record<string, unknown>).lte =
        props.body.shipped_before;
    }
  }

  if (props.body.delivered_after || props.body.delivered_before) {
    whereCondition.delivered_at = {};
    if (props.body.delivered_after) {
      (whereCondition.delivered_at as Record<string, unknown>).gte =
        props.body.delivered_after;
    }
    if (props.body.delivered_before) {
      (whereCondition.delivered_at as Record<string, unknown>).lte =
        props.body.delivered_before;
    }
  }

  const sortBy = props.body.sort_by ?? "created_at";
  const sortOrder = props.body.sort_order ?? "desc";

  const orderByClause: Record<string, string> = {};
  orderByClause[sortBy] = sortOrder;

  const [data, total] = await Promise.all([
    MyGlobal.prisma.shopping_mall_order_sellers.findMany({
      where: whereCondition,
      skip,
      take: limit,
      orderBy: orderByClause,
      include: {
        seller: true,
      },
    }),
    MyGlobal.prisma.shopping_mall_order_sellers.count({
      where: whereCondition,
    }),
  ]);

  return {
    pagination: {
      current: page,
      limit: limit,
      records: total,
      pages: Math.ceil(total / limit),
    },
    data: data.map((orderSeller) => ({
      id: orderSeller.id,
      sub_order_number: orderSeller.sub_order_number,
      status: typia.assert<
        | "pending"
        | "confirmed"
        | "processing"
        | "shipped"
        | "delivered"
        | "cancelled"
      >(orderSeller.status),
      seller: {
        id: orderSeller.seller.id,
        store_name: orderSeller.seller.store_name,
        email: orderSeller.seller.email,
        status: typia.assert<"pending" | "approved" | "rejected" | "suspended">(
          orderSeller.seller.status,
        ),
        email_verified: orderSeller.seller.email_verified,
      },
      subtotal: orderSeller.subtotal,
      shipping_cost: orderSeller.shipping_cost,
      shipping_method: typia.assert<"standard" | "express" | "overnight">(
        orderSeller.shipping_method,
      ),
      tracking_number: orderSeller.tracking_number ?? undefined,
      carrier_name: orderSeller.carrier_name ?? undefined,
      shipped_at: orderSeller.shipped_at
        ? toISOStringSafe(orderSeller.shipped_at)
        : undefined,
      delivered_at: orderSeller.delivered_at
        ? toISOStringSafe(orderSeller.delivered_at)
        : undefined,
      created_at: toISOStringSafe(orderSeller.created_at),
      updated_at: toISOStringSafe(orderSeller.updated_at),
      deleted_at: orderSeller.deleted_at
        ? toISOStringSafe(orderSeller.deleted_at)
        : undefined,
    })),
  };
}
