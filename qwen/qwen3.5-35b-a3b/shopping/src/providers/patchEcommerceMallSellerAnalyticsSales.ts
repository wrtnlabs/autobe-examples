import { IEcommerceMallSalesAnalytic } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSalesAnalytic";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageIEcommerceMallSalesAnalytic } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEcommerceMallSalesAnalytic";
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

export async function patchEcommerceMallSellerAnalyticsSales(props: {
  seller: SellerPayload;
  body: IEcommerceMallSalesAnalytic.IRequest;
}): Promise<IPageIEcommerceMallSalesAnalytic.ISummary> {
  const page = props.body.page ?? 1;
  const limit = Math.min(props.body.limit ?? 20, 100);
  // Validate seller exists and is approved
  const seller = await MyGlobal.prisma.ecommerce_mall_sellers.findUniqueOrThrow(
    {
      where: {
        id: props.seller.id,
        approval_status: "approved",
        is_banned: false,
        deleted_at: null,
      },
    },
  );
  // Build where clause for product filtering
  const productWhere: Prisma.ecommerce_mall_productsWhereInput = {
    seller_id: seller.id,
    deleted_at: null,
  };
  // Apply date filter if provided
  if (props.body.startDate) {
    productWhere.orderItems = {
      some: {
        created_at: {
          gte: new Date(props.body.startDate + "T00:00:00Z"),
        },
      },
    };
  }
  // Apply product filter if provided
  if (props.body.productId) {
    const product =
      await MyGlobal.prisma.ecommerce_mall_products.findUniqueOrThrow({
        where: {
          id: props.body.productId,
          deleted_at: null,
        },
      });
    if (product.seller_id !== seller.id) {
      throw new HttpException("Forbidden", 403);
    }
    productWhere.id = props.body.productId;
  }
  // Query product count
  const productCount = await MyGlobal.prisma.ecommerce_mall_products.count({
    where: productWhere,
  });
  // Build where clause for order items filtering
  const orderItemWhere: Prisma.ecommerce_mall_order_itemsWhereInput = {
    product: {
      seller_id: seller.id,
      deleted_at: null,
    },
  };
  // Apply date filter if provided
  if (props.body.startDate) {
    orderItemWhere.created_at = {
      gte: new Date(props.body.startDate + "T00:00:00Z"),
    };
  }
  // Apply product filter if provided
  if (props.body.productId) {
    orderItemWhere.ecommerce_mall_product_id = props.body.productId;
  }
  // Query order item count
  const orderItemCount = await MyGlobal.prisma.ecommerce_mall_order_items.count(
    {
      where: orderItemWhere,
    },
  );
  // Query pending cancellations count
  const pendingCancellationCount =
    await MyGlobal.prisma.ecommerce_mall_cancellation_requests.count({
      where: {
        orderItem: {
          product: {
            seller_id: seller.id,
            deleted_at: null,
          },
        },
        request_status: "pending",
      },
    });
  // Query pending refunds count
  const pendingRefundCount =
    await MyGlobal.prisma.ecommerce_mall_refund_requests.count({
      where: {
        orderItem: {
          product: {
            seller_id: seller.id,
            deleted_at: null,
          },
        },
        request_status: "pending",
      },
    });
  return {
    pagination: {
      current: page,
      limit: limit,
      records: 1,
      pages: 1,
    } satisfies IPage.IPagination,
    data: [
      {
        productCount,
        orderItemCount,
        pendingCancellationCount,
        pendingRefundCount,
      } satisfies IEcommerceMallSalesAnalytic.ISummary,
    ],
  };
}
