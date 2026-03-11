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

export async function patchEcommerceMallSellerAnalyticsDashboard(props: {
  seller: SellerPayload;
  body: IEcommerceMallDashboard.IRequest;
}): Promise<IEcommerceMallDashboard.ISummary> {
  const sellerId = props.seller.id;
  const dateFilter = (field: string, value?: string) =>
    value ? { [field]: { gte: new Date(value) } } : {};
  const dateRangeFilter = (field: string, from?: string, to?: string) => ({
    ...(from ? { [field]: { gte: new Date(from) } } : {}),
    ...(to ? { [field]: { lte: new Date(to) } } : {}),
  });
  const [
    totalProducts,
    pendingCancellationRequests,
    pendingRefundRequests,
    totalOrderItemsSold,
  ] = await Promise.all([
    MyGlobal.prisma.ecommerce_mall_products.count({
      where: {
        seller_id: sellerId,
        deleted_at: null,
        ...(props.body.category_id
          ? { category_id: props.body.category_id }
          : {}),
        ...dateRangeFilter(
          "created_at",
          props.body.createdAt_from,
          props.body.createdAt_to,
        ),
      },
    }),
    MyGlobal.prisma.ecommerce_mall_cancellation_requests.count({
      where: {
        seller_id: sellerId,
        status: "pending",
        ...dateRangeFilter(
          "created_at",
          props.body.createdAt_from,
          props.body.createdAt_to,
        ),
      },
    }),
    MyGlobal.prisma.ecommerce_mall_refund_requests.count({
      where: {
        seller_id: sellerId,
        status: "pending",
        ...dateRangeFilter(
          "created_at",
          props.body.createdAt_from,
          props.body.createdAt_to,
        ),
      },
    }),
    MyGlobal.prisma.ecommerce_mall_order_items.count({
      where: {
        seller_id: sellerId,
        ...(props.body.item_status
          ? { item_status: props.body.item_status }
          : {}),
        ...dateRangeFilter(
          "created_at",
          props.body.createdAt_from,
          props.body.createdAt_to,
        ),
      },
    }),
  ]);
  return {
    totalProducts,
    pendingCancellationRequests,
    pendingRefundRequests,
    totalOrderItemsSold,
  };
}
