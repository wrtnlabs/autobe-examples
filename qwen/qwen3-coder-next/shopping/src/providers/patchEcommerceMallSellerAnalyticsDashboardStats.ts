import { IEcommerceMallDashboard } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallDashboard";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
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

export async function patchEcommerceMallSellerAnalyticsDashboardStats(props: {
  seller: SellerPayload;
  body: IEcommerceMallDashboard.IRequest;
}): Promise<IEcommerceMallDashboard.ISummary> {
  // Filter products by seller and non-deleted
  const productWhere: Prisma.ecommerce_mall_productsWhereInput = {
    seller_id: props.seller.id,
    deleted_at: null,
  };
  if (props.body.createdAt_from || props.body.createdAt_to) {
    productWhere.created_at = {};
    if (props.body.createdAt_from) {
      productWhere.created_at.gte = toISOStringSafe(
        new Date(props.body.createdAt_from),
      );
    }
    if (props.body.createdAt_to) {
      productWhere.created_at.lte = toISOStringSafe(
        new Date(props.body.createdAt_to),
      );
    }
  }
  if (props.body.category_id) {
    productWhere.category_id = props.body.category_id;
  }
  const totalProducts = await MyGlobal.prisma.ecommerce_mall_products.count({
    where: productWhere,
  });
  // Count pending cancellation requests for seller
  const pendingCancellationRequests =
    await MyGlobal.prisma.ecommerce_mall_cancellation_requests.count({
      where: {
        seller_id: props.seller.id,
        status: "pending",
        deleted_at: null,
      },
    });
  // Count pending refund requests for seller
  const pendingRefundRequests =
    await MyGlobal.prisma.ecommerce_mall_refund_requests.count({
      where: {
        seller_id: props.seller.id,
        status: "pending",
      },
    });
  // Count order items sold by seller with optional status filter
  const whereOrderItems: Prisma.ecommerce_mall_order_itemsWhereInput = {
    seller_id: props.seller.id,
  };
  if (props.body.createdAt_from || props.body.createdAt_to) {
    whereOrderItems.created_at = {};
    if (props.body.createdAt_from) {
      whereOrderItems.created_at.gte = toISOStringSafe(
        new Date(props.body.createdAt_from),
      );
    }
    if (props.body.createdAt_to) {
      whereOrderItems.created_at.lte = toISOStringSafe(
        new Date(props.body.createdAt_to),
      );
    }
  }
  if (props.body.item_status) {
    whereOrderItems.item_status = props.body.item_status;
  }
  const totalOrderItemsSold =
    await MyGlobal.prisma.ecommerce_mall_order_items.count({
      where: whereOrderItems,
    });
  return {
    totalProducts,
    pendingCancellationRequests,
    pendingRefundRequests,
    totalOrderItemsSold,
  };
}
