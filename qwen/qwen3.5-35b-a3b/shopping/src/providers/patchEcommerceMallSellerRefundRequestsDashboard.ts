import { IEcommerceMallOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallOrder";
import { IEcommerceMallOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallOrderItem";
import { IEcommerceMallRefundRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallRefundRequest";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageIEcommerceMallRefundRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEcommerceMallRefundRequest";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { SellerPayload } from "../decorators/payload/SellerPayload";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchEcommerceMallSellerRefundRequestsDashboard(props: {
  seller: SellerPayload;
  body: IEcommerceMallRefundRequest.IRequest;
}): Promise<IPageIEcommerceMallRefundRequest.ISummary> {
  const page = props.body.page ?? 1;
  const limit = props.body.limit ?? 20;
  const cursor = props.body.cursor;
  // Fetch seller's active products to filter order items
  const sellerProducts = await MyGlobal.prisma.ecommerce_mall_products.findMany(
    {
      where: {
        seller_id: props.seller.id,
        deleted_at: null,
        is_active: true,
      },
      select: { id: true },
    },
  );
  const sellerProductIds = sellerProducts.map((p) => p.id);
  // Build base WHERE clause for refund requests
  const baseWhere: Prisma.ecommerce_mall_refund_requestsWhereInput = {
    deleted_at: null,
    ...(sellerProductIds.length > 0 && {
      orderItem: {
        ecommerce_mall_product_id: {
          in: sellerProductIds,
        },
      },
    }),
    ...(props.body.request_status !== undefined && {
      request_status: props.body.request_status,
    }),
    ...(props.body.created_at_gte !== undefined && {
      created_at: {
        gte: props.body.created_at_gte,
      },
    }),
    ...(props.body.created_at_lte !== undefined && {
      created_at: {
        lte: props.body.created_at_lte,
      },
    }),
    ...(props.body.reason !== undefined && {
      reason: {
        contains: props.body.reason,
      },
    }),
  };
  // Apply cursor-based pagination
  let whereInput: Prisma.ecommerce_mall_refund_requestsWhereInput = baseWhere;
  if (cursor) {
    const [cursorCreatedAt, cursorId] = cursor.split(":");
    whereInput = {
      AND: [
        baseWhere,
        {
          OR: [
            { created_at: { lt: cursorCreatedAt } },
            {
              created_at: { equals: cursorCreatedAt },
              id: { lt: cursorId },
            },
          ],
        },
      ],
    };
  }
  const take = limit + 1;
  const [data, total] = await Promise.all([
    MyGlobal.prisma.ecommerce_mall_refund_requests.findMany({
      where: whereInput,
      orderBy: [{ created_at: "desc" }, { id: "desc" }],
      take,
      select: {
        id: true,
        order_item_id: true,
        reason: true,
        request_status: true,
        time_limit: true,
        created_at: true,
        updated_at: true,
        orderItem: {
          select: {
            id: true,
            quantity: true,
            unit_price: true,
            item_status: true,
            created_at: true,
            updated_at: true,
            product_snapshot: true,
            variant_snapshot: true,
            seller_profile_snapshot: true,
            order: {
              select: {
                id: true,
                order_number: true,
                total_price: true,
                overall_status: true,
                created_at: true,
                updated_at: true,
                deleted_at: true,
              },
            },
          },
        },
      },
    }),
    MyGlobal.prisma.ecommerce_mall_refund_requests.count({
      where: whereInput,
    }),
  ]);
  const hasNextPage = data.length > limit;
  const nextCursor = hasNextPage
    ? `${data[limit].created_at.toISOString()}:${data[limit].id}`
    : undefined;
  // Transform results
  const transformedData = await Promise.all(
    data.slice(0, limit).map((refund) => {
      const orderSummary: IEcommerceMallOrder.ISummary = {
        id: refund.orderItem.order.id,
        order_number: refund.orderItem.order.order_number,
        total_price: refund.orderItem.order.total_price,
        overall_status: refund.orderItem.order.overall_status,
        created_at: refund.orderItem.order.created_at.toISOString(),
        updated_at: refund.orderItem.order.updated_at.toISOString(),
        deleted_at: refund.orderItem.order.deleted_at
          ? refund.orderItem.order.deleted_at.toISOString()
          : null,
      };
      const orderItemSummary: IEcommerceMallOrderItem.ISummary = {
        id: refund.orderItem.id,
        order: orderSummary,
        quantity: refund.orderItem.quantity,
        unitPrice: refund.orderItem.unit_price,
        itemStatus: refund.orderItem.item_status as
          | "paid"
          | "shipped"
          | "delivered"
          | "cancelled"
          | "refunded",
        created_at: refund.orderItem.created_at.toISOString(),
        updated_at: refund.orderItem.updated_at.toISOString(),
        productSnapshot: refund.orderItem.product_snapshot,
        variantSnapshot: refund.orderItem.variant_snapshot,
        sellerProfileSnapshot: refund.orderItem.seller_profile_snapshot,
      };
      const timeLimit: (string & tags.Format<"date-time">) | null | undefined =
        refund.time_limit ? refund.time_limit.toISOString() : undefined;
      return {
        id: refund.id,
        orderItem: orderItemSummary,
        reason: refund.reason,
        request_status: refund.request_status as
          | "pending"
          | "approved"
          | "rejected",
        time_limit: timeLimit,
        created_at: refund.created_at.toISOString(),
        updated_at: refund.updated_at.toISOString(),
      } satisfies IEcommerceMallRefundRequest.ISummary;
    }),
  );
  return {
    data: transformedData,
    pagination: {
      current: page,
      limit,
      records: total,
      pages: Math.ceil(total / limit),
    } satisfies IPage.IPagination,
  };
}
