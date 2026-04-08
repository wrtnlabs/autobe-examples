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
import { MemberPayload } from "../decorators/payload/MemberPayload";
import { ShoppingMallOrderAtSummaryTransformer } from "../transformers/ShoppingMallOrderAtSummaryTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchShoppingMallMemberOrders(props: {
  member: MemberPayload;
  body: IShoppingMallOrder.IRequest;
}): Promise<IPageIShoppingMallOrder.ISummary> {
  const page = props.body.page ?? 1;
  const limit = props.body.limit ?? 20;
  const skip = (page - 1) * limit;
  const whereInput: Prisma.shopping_mall_ordersWhereInput = {
    member_id: props.member.id,
    deleted_at: null,
    ...(props.body.search !== undefined && {
      code: { contains: props.body.search, mode: "insensitive" },
    }),
    ...(props.body.created_at_gte !== undefined && {
      created_at: { gte: new Date(props.body.created_at_gte) },
    }),
    ...(props.body.created_at_lte !== undefined && {
      created_at: { lte: new Date(props.body.created_at_lte) },
    }),
  } satisfies Prisma.shopping_mall_ordersWhereInput;
  const sortField = props.body.sort ?? "created_at";
  const sortDirection = props.body.direction ?? "desc";
  const orderByInput: Prisma.shopping_mall_ordersOrderByWithRelationInput = {
    [sortField]: sortDirection,
  } satisfies Prisma.shopping_mall_ordersOrderByWithRelationInput;
  const orders = await MyGlobal.prisma.shopping_mall_orders.findMany({
    where: whereInput,
    skip,
    take: limit,
    orderBy: orderByInput,
    ...ShoppingMallOrderAtSummaryTransformer.select(),
  });
  const total = await MyGlobal.prisma.shopping_mall_orders.count({
    where: whereInput,
  });
  let filteredOrders = orders;
  if (props.body.status !== undefined) {
    const statusFilter = Array.isArray(props.body.status)
      ? props.body.status
      : [props.body.status];
    filteredOrders = orders.filter((order) =>
      statusFilter.includes(computeOrderStatus(order.orderItems)),
    );
  }
  return {
    pagination: {
      current: page,
      limit: limit,
      records: total,
      pages: Math.ceil(total / limit),
    } satisfies IPage.IPagination,
    data: await ArrayUtil.asyncMap(
      filteredOrders,
      ShoppingMallOrderAtSummaryTransformer.transform,
    ),
  };
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
