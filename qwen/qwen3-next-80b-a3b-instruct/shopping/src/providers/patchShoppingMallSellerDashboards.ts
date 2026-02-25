import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageIShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallAdmin";
import { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
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

export async function patchShoppingMallSellerDashboards(props: {
  seller: SellerPayload;
}): Promise<IPageIShoppingMallAdmin.ISummary> {
  const [
    total_customers,
    total_sellers,
    total_products,
    total_orders,
    pending_seller_approvals,
    pending_cancellation_requests,
    pending_refund_requests,
  ] = await Promise.all([
    MyGlobal.prisma.shopping_mall_customers.count({
      where: { deleted_at: null },
    }),
    MyGlobal.prisma.shopping_mall_sellers.count({
      where: { deleted_at: null },
    }),
    MyGlobal.prisma.shopping_mall_products.count({
      where: { deleted_at: null },
    }),
    MyGlobal.prisma.shopping_mall_orders.count({ where: {} }),
    MyGlobal.prisma.shopping_mall_sellers.count({
      where: { status: "pending", deleted_at: null },
    }),
    MyGlobal.prisma.shopping_mall_cancellation_requests.count({
      where: { status: "pending" },
    }),
    MyGlobal.prisma.shopping_mall_refund_requests.count({
      where: { status: "pending" },
    }),
  ]);
  let total_products_filtered = 0;
  let total_order_items = 0;
  let pending_cancellation_requests_filtered = 0;
  let pending_refund_requests_filtered = 0;
  if (props.seller) {
    const sellerId = props.seller.id;
    [
      total_products_filtered,
      total_order_items,
      pending_cancellation_requests_filtered,
      pending_refund_requests_filtered,
    ] = await Promise.all([
      MyGlobal.prisma.shopping_mall_products.count({
        where: { seller_id: sellerId, deleted_at: null },
      }),
      MyGlobal.prisma.shopping_mall_order_items.count({
        where: { shopping_mall_seller_id: sellerId },
      }),
      MyGlobal.prisma.shopping_mall_cancellation_requests.count({
        where: {
          status: "pending",
          orderItem: { shopping_mall_seller_id: sellerId },
        },
      }),
      MyGlobal.prisma.shopping_mall_refund_requests.count({
        where: {
          status: "pending",
          orderItem: { shopping_mall_seller_id: sellerId },
        },
      }),
    ]);
  }
  const data: IShoppingMallAdmin.ISummary = {
    total_customers,
    total_sellers,
    total_products: props.seller ? total_products_filtered : total_products,
    total_orders,
    pending_seller_approvals,
    pending_cancellation_requests: props.seller
      ? pending_cancellation_requests_filtered
      : pending_cancellation_requests,
    pending_refund_requests: props.seller
      ? pending_refund_requests_filtered
      : pending_refund_requests,
  };
  return {
    pagination: {
      current: 1,
      limit: 1,
      records: 1,
      pages: 1,
    } satisfies IPage.IPagination,
    data: [data],
  } satisfies IPageIShoppingMallAdmin.ISummary;
}
