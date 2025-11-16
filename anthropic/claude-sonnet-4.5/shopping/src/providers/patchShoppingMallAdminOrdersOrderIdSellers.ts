import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
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
import { AdminPayload } from "../decorators/payload/AdminPayload";

export async function patchShoppingMallAdminOrdersOrderIdSellers(props: {
  admin: AdminPayload;
  orderId: string & tags.Format<"uuid">;
  body: IShoppingMallOrderSeller.IRequest;
}): Promise<IPageIShoppingMallOrderSeller.ISummary> {
  // Verify parent order exists
  const order = await MyGlobal.prisma.shopping_mall_orders.findUnique({
    where: { id: props.orderId },
  });

  if (!order) {
    throw new HttpException("Order not found", 404);
  }

  // Build WHERE clause for complex filtering
  const buildWhereCondition = () => {
    const conditions: Record<string, unknown> = {
      shopping_mall_order_id: props.orderId,
      deleted_at: null,
    };

    if (props.body.seller_id) {
      conditions.shopping_mall_seller_id = props.body.seller_id;
    }

    if (props.body.status) {
      conditions.status = props.body.status;
    }

    if (
      props.body.min_subtotal !== undefined ||
      props.body.max_subtotal !== undefined
    ) {
      const subtotalFilter: Record<string, unknown> = {};
      if (props.body.min_subtotal !== undefined) {
        subtotalFilter.gte = props.body.min_subtotal;
      }
      if (props.body.max_subtotal !== undefined) {
        subtotalFilter.lte = props.body.max_subtotal;
      }
      conditions.subtotal = subtotalFilter;
    }

    if (props.body.shipping_method) {
      conditions.shipping_method = props.body.shipping_method;
    }

    if (props.body.tracking_number) {
      conditions.tracking_number = props.body.tracking_number;
    }

    if (props.body.carrier_name) {
      conditions.carrier_name = props.body.carrier_name;
    }

    if (props.body.shipped_after || props.body.shipped_before) {
      const shippedFilter: Record<string, unknown> = {};
      if (props.body.shipped_after) {
        shippedFilter.gte = props.body.shipped_after;
      }
      if (props.body.shipped_before) {
        shippedFilter.lte = props.body.shipped_before;
      }
      conditions.shipped_at = shippedFilter;
    }

    if (props.body.delivered_after || props.body.delivered_before) {
      const deliveredFilter: Record<string, unknown> = {};
      if (props.body.delivered_after) {
        deliveredFilter.gte = props.body.delivered_after;
      }
      if (props.body.delivered_before) {
        deliveredFilter.lte = props.body.delivered_before;
      }
      conditions.delivered_at = deliveredFilter;
    }

    if (props.body.search) {
      conditions.OR = [
        {
          tracking_number: {
            contains: props.body.search,
            mode: "insensitive",
          },
        },
        {
          carrier_name: {
            contains: props.body.search,
            mode: "insensitive",
          },
        },
        {
          seller: {
            store_name: {
              contains: props.body.search,
              mode: "insensitive",
            },
          },
        },
        {
          seller: {
            business_name: {
              contains: props.body.search,
              mode: "insensitive",
            },
          },
        },
      ];
    }

    return conditions;
  };

  const whereCondition = buildWhereCondition();

  const page = props.body.page ?? 1;
  const limit = props.body.limit ?? 20;
  const skip = (page - 1) * limit;

  const sortBy = props.body.sort_by ?? "created_at";
  const sortOrder = props.body.sort_order ?? "desc";
  const orderBy = { [sortBy]: sortOrder };

  const [data, total] = await Promise.all([
    MyGlobal.prisma.shopping_mall_order_sellers.findMany({
      where: whereCondition,
      skip,
      take: limit,
      orderBy,
      include: {
        seller: true,
      },
    }),
    MyGlobal.prisma.shopping_mall_order_sellers.count({
      where: whereCondition,
    }),
  ]);

  const summaries: IShoppingMallOrderSeller.ISummary[] = data.map(
    (segment) => ({
      id: segment.id,
      sub_order_number: segment.sub_order_number,
      status: segment.status as
        | "pending"
        | "confirmed"
        | "processing"
        | "shipped"
        | "delivered"
        | "cancelled",
      seller: {
        id: segment.seller.id,
        store_name: segment.seller.store_name,
        email: segment.seller.email,
        status: segment.seller.status as
          | "pending"
          | "approved"
          | "rejected"
          | "suspended",
        email_verified: segment.seller.email_verified,
      },
      subtotal: segment.subtotal,
      shipping_cost: segment.shipping_cost,
      shipping_method: segment.shipping_method,
      tracking_number: segment.tracking_number ?? undefined,
      carrier_name: segment.carrier_name ?? undefined,
      shipped_at: segment.shipped_at
        ? toISOStringSafe(segment.shipped_at)
        : undefined,
      delivered_at: segment.delivered_at
        ? toISOStringSafe(segment.delivered_at)
        : undefined,
      created_at: toISOStringSafe(segment.created_at),
      updated_at: toISOStringSafe(segment.updated_at),
      deleted_at: segment.deleted_at
        ? toISOStringSafe(segment.deleted_at)
        : undefined,
    }),
  );

  return {
    pagination: {
      current: page,
      limit,
      records: total,
      pages: Math.ceil(total / limit),
    },
    data: summaries,
  };
}
