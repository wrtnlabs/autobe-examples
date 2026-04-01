import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IShoppingMallSellerDashboard } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSellerDashboard";
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

export async function patchShoppingMallSellerDashboard(props: {
  seller: SellerPayload;
  body: IShoppingMallSellerDashboard.IRequest;
}): Promise<IShoppingMallSellerDashboard> {
  const fromDate = props.body.from_date;
  const toDate = props.body.to_date;
  const productWhere: Prisma.shopping_mall_productsWhereInput = {
    seller_id: props.seller.id,
    deleted_at: null,
    ...(fromDate && { created_at: { gte: new Date(fromDate + "T00:00:00Z") } }),
    ...(toDate && { created_at: { lte: new Date(toDate + "T23:59:59Z") } }),
  } satisfies Prisma.shopping_mall_productsWhereInput;
  const orderItemWhere: Prisma.shopping_mall_order_itemsWhereInput = {
    shopping_mall_seller_id: props.seller.id,
    deleted_at: null,
    ...(fromDate && { created_at: { gte: new Date(fromDate + "T00:00:00Z") } }),
    ...(toDate && { created_at: { lte: new Date(toDate + "T23:59:59Z") } }),
  } satisfies Prisma.shopping_mall_order_itemsWhereInput;
  const cancellationRequestWhere: Prisma.shopping_mall_cancellation_requestsWhereInput =
    {
      status: "pending",
      orderItem: {
        shopping_mall_seller_id: props.seller.id,
      },
      ...(fromDate && {
        created_at: { gte: new Date(fromDate + "T00:00:00Z") },
      }),
      ...(toDate && { created_at: { lte: new Date(toDate + "T23:59:59Z") } }),
    } satisfies Prisma.shopping_mall_cancellation_requestsWhereInput;
  const refundRequestWhere: Prisma.shopping_mall_refund_requestsWhereInput = {
    status: "pending",
    seller_id: props.seller.id,
    ...(fromDate && { created_at: { gte: new Date(fromDate + "T00:00:00Z") } }),
    ...(toDate && { created_at: { lte: new Date(toDate + "T23:59:59Z") } }),
  } satisfies Prisma.shopping_mall_refund_requestsWhereInput;
  const productsCount = await MyGlobal.prisma.shopping_mall_products.count({
    where: productWhere,
  });
  const orderItemsCount = await MyGlobal.prisma.shopping_mall_order_items.count(
    {
      where: orderItemWhere,
    },
  );
  const pendingCancellationRequestsCount =
    await MyGlobal.prisma.shopping_mall_cancellation_requests.count({
      where: cancellationRequestWhere,
    });
  const pendingRefundRequestsCount =
    await MyGlobal.prisma.shopping_mall_refund_requests.count({
      where: refundRequestWhere,
    });
  return {
    products_count: productsCount,
    order_items_count: orderItemsCount,
    pending_cancellation_requests_count: pendingCancellationRequestsCount,
    pending_refund_requests_count: pendingRefundRequestsCount,
  } satisfies IShoppingMallSellerDashboard;
}
