import { IEcommerceMallAnalytic } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallAnalytic";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { AdminPayload } from "../decorators/payload/AdminPayload";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function getEcommerceMallAdminAnalytics(props: {
  admin: AdminPayload;
}): Promise<IEcommerceMallAnalytic> {
  // Customer counts
  const customers = await MyGlobal.prisma.ecommerce_mall_customers.count({
    where: { deleted_at: null },
  });
  const customersByStatusGroups =
    await MyGlobal.prisma.ecommerce_mall_customers.groupBy({
      by: ["account_status"],
      where: { deleted_at: null },
      _count: { account_status: true },
    });
  const customersByStatus: {
    active: number & tags.Type<"int32"> & tags.Minimum<0>;
    suspended: number & tags.Type<"int32"> & tags.Minimum<0>;
    banned: number & tags.Type<"int32"> & tags.Minimum<0>;
  } = {
    active: 0,
    suspended: 0,
    banned: 0,
  };
  for (const group of customersByStatusGroups) {
    if (group.account_status === "active")
      customersByStatus.active = group._count.account_status as number &
        tags.Type<"int32"> &
        tags.Minimum<0>;
    else if (group.account_status === "suspended")
      customersByStatus.suspended = group._count.account_status as number &
        tags.Type<"int32"> &
        tags.Minimum<0>;
    else if (group.account_status === "banned")
      customersByStatus.banned = group._count.account_status as number &
        tags.Type<"int32"> &
        tags.Minimum<0>;
  }
  // Seller counts
  const sellers = await MyGlobal.prisma.ecommerce_mall_sellers.count({
    where: { deleted_at: null },
  });
  const sellersByApprovalStatusGroups =
    await MyGlobal.prisma.ecommerce_mall_sellers.groupBy({
      by: ["approval_status"],
      where: { deleted_at: null },
      _count: { approval_status: true },
    });
  const sellersByApprovalStatus: {
    pending: number & tags.Type<"int32"> & tags.Minimum<0>;
    approved: number & tags.Type<"int32"> & tags.Minimum<0>;
    rejected: number & tags.Type<"int32"> & tags.Minimum<0>;
  } = {
    pending: 0,
    approved: 0,
    rejected: 0,
  };
  for (const group of sellersByApprovalStatusGroups) {
    if (group.approval_status === "pending")
      sellersByApprovalStatus.pending = group._count.approval_status as number &
        tags.Type<"int32"> &
        tags.Minimum<0>;
    else if (group.approval_status === "approved")
      sellersByApprovalStatus.approved = group._count
        .approval_status as number & tags.Type<"int32"> & tags.Minimum<0>;
    else if (group.approval_status === "rejected")
      sellersByApprovalStatus.rejected = group._count
        .approval_status as number & tags.Type<"int32"> & tags.Minimum<0>;
  }
  const sellersByAccountStatusGroups =
    await MyGlobal.prisma.ecommerce_mall_sellers.groupBy({
      by: ["account_status"],
      where: { deleted_at: null },
      _count: { account_status: true },
    });
  const sellersByAccountStatus: {
    active: number & tags.Type<"int32"> & tags.Minimum<0>;
    suspended: number & tags.Type<"int32"> & tags.Minimum<0>;
    banned: number & tags.Type<"int32"> & tags.Minimum<0>;
  } = {
    active: 0,
    suspended: 0,
    banned: 0,
  };
  for (const group of sellersByAccountStatusGroups) {
    if (group.account_status === "active")
      sellersByAccountStatus.active = group._count.account_status as number &
        tags.Type<"int32"> &
        tags.Minimum<0>;
    else if (group.account_status === "suspended")
      sellersByAccountStatus.suspended = group._count.account_status as number &
        tags.Type<"int32"> &
        tags.Minimum<0>;
    else if (group.account_status === "banned")
      sellersByAccountStatus.banned = group._count.account_status as number &
        tags.Type<"int32"> &
        tags.Minimum<0>;
  }
  // Product counts
  const products = await MyGlobal.prisma.ecommerce_mall_products.count({
    where: { deleted_at: null },
  });
  const productsByStatusGroups =
    await MyGlobal.prisma.ecommerce_mall_products.groupBy({
      by: ["status"],
      where: { deleted_at: null },
      _count: { status: true },
    });
  const productsByStatus: {
    active: number & tags.Type<"int32"> & tags.Minimum<0>;
    deleted: number & tags.Type<"int32"> & tags.Minimum<0>;
    suspended: number & tags.Type<"int32"> & tags.Minimum<0>;
  } = {
    active: 0,
    deleted: 0,
    suspended: 0,
  };
  for (const group of productsByStatusGroups) {
    if (group.status === "active")
      productsByStatus.active = group._count.status as number &
        tags.Type<"int32"> &
        tags.Minimum<0>;
    else if (group.status === "deleted")
      productsByStatus.deleted = group._count.status as number &
        tags.Type<"int32"> &
        tags.Minimum<0>;
    else if (group.status === "suspended")
      productsByStatus.suspended = group._count.status as number &
        tags.Type<"int32"> &
        tags.Minimum<0>;
  }
  // Order counts
  const orders = await MyGlobal.prisma.ecommerce_mall_orders.count({
    where: { deleted_at: null },
  });
  const ordersByStatusGroups =
    await MyGlobal.prisma.ecommerce_mall_orders.groupBy({
      by: ["status"],
      where: { deleted_at: null },
      _count: { status: true },
    });
  const ordersByStatus: {
    paid: number & tags.Type<"int32"> & tags.Minimum<0>;
    shipped: number & tags.Type<"int32"> & tags.Minimum<0>;
    delivered: number & tags.Type<"int32"> & tags.Minimum<0>;
    cancelled: number & tags.Type<"int32"> & tags.Minimum<0>;
    refunded: number & tags.Type<"int32"> & tags.Minimum<0>;
    partiallyCompleted: number & tags.Type<"int32"> & tags.Minimum<0>;
  } = {
    paid: 0,
    shipped: 0,
    delivered: 0,
    cancelled: 0,
    refunded: 0,
    partiallyCompleted: 0,
  };
  for (const group of ordersByStatusGroups) {
    if (group.status === "paid")
      ordersByStatus.paid = group._count.status as number &
        tags.Type<"int32"> &
        tags.Minimum<0>;
    else if (group.status === "shipped")
      ordersByStatus.shipped = group._count.status as number &
        tags.Type<"int32"> &
        tags.Minimum<0>;
    else if (group.status === "delivered")
      ordersByStatus.delivered = group._count.status as number &
        tags.Type<"int32"> &
        tags.Minimum<0>;
    else if (group.status === "cancelled")
      ordersByStatus.cancelled = group._count.status as number &
        tags.Type<"int32"> &
        tags.Minimum<0>;
    else if (group.status === "refunded")
      ordersByStatus.refunded = group._count.status as number &
        tags.Type<"int32"> &
        tags.Minimum<0>;
    else if (group.status === "partiallyCompleted")
      ordersByStatus.partiallyCompleted = group._count.status as number &
        tags.Type<"int32"> &
        tags.Minimum<0>;
  }
  // Order item counts
  const orderItems = await MyGlobal.prisma.ecommerce_mall_order_items.count({
    where: { deleted_at: null },
  });
  // Pending cancellation requests
  const pendingCancellationRequests =
    await MyGlobal.prisma.ecommerce_mall_order_item_cancellation_requests.count(
      {
        where: {
          status: "pending",
          deleted_at: null,
        },
      },
    );
  // Pending refund requests
  const pendingRefundRequests =
    await MyGlobal.prisma.ecommerce_mall_order_item_refund_requests.count({
      where: {
        status: "pending",
        deleted_at: null,
      },
    });
  return typia.assert<IEcommerceMallAnalytic>({
    customers: customers as number & tags.Type<"int32"> & tags.Minimum<0>,
    customersByStatus,
    sellers: sellers as number & tags.Type<"int32"> & tags.Minimum<0>,
    sellersByApprovalStatus,
    sellersByAccountStatus,
    products: products as number & tags.Type<"int32"> & tags.Minimum<0>,
    productsByStatus,
    orders: orders as number & tags.Type<"int32"> & tags.Minimum<0>,
    ordersByStatus,
    orderItems: orderItems as number & tags.Type<"int32"> & tags.Minimum<0>,
    pendingCancellationRequests: pendingCancellationRequests as number &
      tags.Type<"int32"> &
      tags.Minimum<0>,
    pendingRefundRequests: pendingRefundRequests as number &
      tags.Type<"int32"> &
      tags.Minimum<0>,
  });
}
