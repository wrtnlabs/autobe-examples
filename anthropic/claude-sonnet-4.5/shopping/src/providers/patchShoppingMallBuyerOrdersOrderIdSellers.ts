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
import { BuyerPayload } from "../decorators/payload/BuyerPayload";

export async function patchShoppingMallBuyerOrdersOrderIdSellers(props: {
  buyer: BuyerPayload;
  orderId: string & tags.Format<"uuid">;
  body: IShoppingMallOrderSeller.IRequest;
}): Promise<IPageIShoppingMallOrderSeller.ISummary> {
  const order = await MyGlobal.prisma.shopping_mall_orders.findFirst({
    where: {
      id: props.orderId,
      deleted_at: null,
    },
  });

  if (!order) {
    throw new HttpException("Order not found", 404);
  }

  if (order.shopping_mall_buyer_id !== props.buyer.id) {
    throw new HttpException("Forbidden", 403);
  }

  const page = props.body.page ?? 1;
  const limit = props.body.limit ?? 20;
  const skip = (page - 1) * limit;

  const whereCondition: Prisma.shopping_mall_order_sellersWhereInput = {
    shopping_mall_order_id: props.orderId,
    deleted_at: null,
    ...(props.body.seller_id && {
      shopping_mall_seller_id: props.body.seller_id,
    }),
    ...(props.body.status && {
      status: props.body.status,
    }),
    ...((props.body.min_subtotal !== undefined ||
      props.body.max_subtotal !== undefined) && {
      subtotal: {
        ...(props.body.min_subtotal !== undefined && {
          gte: props.body.min_subtotal,
        }),
        ...(props.body.max_subtotal !== undefined && {
          lte: props.body.max_subtotal,
        }),
      },
    }),
    ...(props.body.shipping_method && {
      shipping_method: props.body.shipping_method,
    }),
    ...(props.body.tracking_number && {
      tracking_number: props.body.tracking_number,
    }),
    ...(props.body.carrier_name && {
      carrier_name: props.body.carrier_name,
    }),
    ...((props.body.shipped_after || props.body.shipped_before) && {
      shipped_at: {
        ...(props.body.shipped_after && {
          gte: new Date(props.body.shipped_after),
        }),
        ...(props.body.shipped_before && {
          lte: new Date(props.body.shipped_before),
        }),
      },
    }),
    ...((props.body.delivered_after || props.body.delivered_before) && {
      delivered_at: {
        ...(props.body.delivered_after && {
          gte: new Date(props.body.delivered_after),
        }),
        ...(props.body.delivered_before && {
          lte: new Date(props.body.delivered_before),
        }),
      },
    }),
    ...(props.body.search && {
      OR: [
        {
          seller: {
            business_name: {
              contains: props.body.search,
              mode: Prisma.QueryMode.insensitive,
            },
          },
        },
        {
          seller: {
            store_name: {
              contains: props.body.search,
              mode: Prisma.QueryMode.insensitive,
            },
          },
        },
        {
          tracking_number: {
            contains: props.body.search,
            mode: Prisma.QueryMode.insensitive,
          },
        },
        {
          carrier_name: {
            contains: props.body.search,
            mode: Prisma.QueryMode.insensitive,
          },
        },
      ],
    }),
  };

  const sortBy = props.body.sort_by ?? "created_at";
  const sortOrder = props.body.sort_order ?? "desc";

  const orderBy: Prisma.shopping_mall_order_sellersOrderByWithRelationInput = {
    [sortBy]: sortOrder,
  };

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

  return {
    pagination: {
      current: page,
      limit: limit,
      records: total,
      pages: Math.ceil(total / limit),
    },
    data: data.map((segment) => ({
      id: segment.id,
      sub_order_number: segment.sub_order_number,
      status: typia.assert<
        | "pending"
        | "confirmed"
        | "processing"
        | "shipped"
        | "delivered"
        | "cancelled"
      >(segment.status),
      seller: {
        id: segment.seller.id,
        store_name: segment.seller.store_name,
        email: segment.seller.email,
        status: typia.assert<"pending" | "approved" | "rejected" | "suspended">(
          segment.seller.status,
        ),
        email_verified: segment.seller.email_verified,
      },
      subtotal: segment.subtotal,
      shipping_cost: segment.shipping_cost,
      shipping_method: segment.shipping_method,
      tracking_number: segment.tracking_number ?? null,
      carrier_name: segment.carrier_name ?? null,
      shipped_at: segment.shipped_at
        ? toISOStringSafe(segment.shipped_at)
        : null,
      delivered_at: segment.delivered_at
        ? toISOStringSafe(segment.delivered_at)
        : null,
      created_at: toISOStringSafe(segment.created_at),
      updated_at: toISOStringSafe(segment.updated_at),
      deleted_at: segment.deleted_at
        ? toISOStringSafe(segment.deleted_at)
        : null,
    })),
  };
}
