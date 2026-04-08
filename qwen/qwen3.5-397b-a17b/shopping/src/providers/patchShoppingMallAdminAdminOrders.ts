import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageIShoppingMallOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallOrder";
import { IShoppingMallCustomerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomerProfile";
import { IShoppingMallMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallMember";
import { IShoppingMallOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrder";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { AdminPayload } from "../decorators/payload/AdminPayload";
import { ShoppingMallOrderAtSummaryTransformer } from "../transformers/ShoppingMallOrderAtSummaryTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchShoppingMallAdminAdminOrders(props: {
  admin: AdminPayload;
  body: IShoppingMallOrder.IRequest;
}): Promise<IPageIShoppingMallOrder.ISummary> {
  const page = props.body.page ?? 1;
  const limit = props.body.limit ?? 20;
  const skip = (page - 1) * limit;
  const sortField = props.body.sort ?? "created_at";
  const direction = props.body.direction ?? "desc";
  const orderByInput: Prisma.shopping_mall_ordersOrderByWithRelationInput = {
    [sortField]: direction,
  };
  const whereInput: Prisma.shopping_mall_ordersWhereInput = {
    deleted_at: null,
  };
  if (props.body.search !== undefined) {
    whereInput.code = { contains: props.body.search, mode: "insensitive" };
  }
  if (props.body.member_id !== undefined) {
    whereInput.member_id = props.body.member_id;
  }
  if (props.body.seller_id !== undefined) {
    whereInput.orderItems = {
      some: {
        shopping_mall_seller_id: props.body.seller_id,
      },
    };
  }
  if (
    props.body.created_at_gte !== undefined ||
    props.body.created_at_lte !== undefined
  ) {
    const created_at: Prisma.DateTimeFilter = {};
    if (props.body.created_at_gte !== undefined) {
      created_at.gte = props.body.created_at_gte;
    }
    if (props.body.created_at_lte !== undefined) {
      created_at.lte = props.body.created_at_lte;
    }
    whereInput.created_at = created_at;
  }
  const data = await MyGlobal.prisma.shopping_mall_orders.findMany({
    where: whereInput,
    skip,
    take: limit,
    orderBy: orderByInput,
    ...ShoppingMallOrderAtSummaryTransformer.select(),
  });
  const total = await MyGlobal.prisma.shopping_mall_orders.count({
    where: whereInput,
  });
  let filteredData = data;
  if (props.body.status !== undefined) {
    const statusFilter = Array.isArray(props.body.status)
      ? props.body.status
      : [props.body.status];
    filteredData = data.filter((order) => {
      const status = computeOrderStatus(order.orderItems);
      return statusFilter.includes(status);
    });
  }
  return {
    pagination: {
      current: page,
      limit: limit,
      records: total,
      pages: Math.ceil(total / limit),
    } satisfies IPage.IPagination,
    data: await ArrayUtil.asyncMap(
      filteredData,
      ShoppingMallOrderAtSummaryTransformer.transform,
    ),
  } satisfies IPageIShoppingMallOrder.ISummary;
}
function computeOrderStatus(
  orderItems: Array<{
    status: string;
  }>,
): string {
  if (orderItems.length === 0) {
    return "paid";
  }
  const hasCancelled = orderItems.some((item) => item.status === "cancelled");
  const hasRefunded = orderItems.some((item) => item.status === "refunded");
  const hasDelivered = orderItems.every((item) => item.status === "delivered");
  const hasShipped = orderItems.some((item) => item.status === "shipped");
  if (hasCancelled) {
    return "cancelled";
  }
  if (hasRefunded) {
    return "refunded";
  }
  if (hasDelivered) {
    return "delivered";
  }
  if (hasShipped) {
    return "shipped";
  }
  return "paid";
}
