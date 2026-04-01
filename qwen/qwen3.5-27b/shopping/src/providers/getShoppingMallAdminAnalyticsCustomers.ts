import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IShoppingMallCustomerAnalytic } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomerAnalytic";
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

export async function getShoppingMallAdminAnalyticsCustomers(props: {
  admin: AdminPayload;
}): Promise<IShoppingMallCustomerAnalytic> {
  // Query customer counts
  const totalCustomers = await MyGlobal.prisma.shopping_mall_customers.count({
    where: {
      deleted_at: null,
    },
  });
  const activeCustomers = await MyGlobal.prisma.shopping_mall_customers.count({
    where: {
      status: "active",
      deleted_at: null,
    },
  });
  const suspendedCustomers =
    await MyGlobal.prisma.shopping_mall_customers.count({
      where: {
        status: "suspended",
      },
    });
  const bannedCustomers = await MyGlobal.prisma.shopping_mall_customers.count({
    where: {
      status: "banned",
    },
  });
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
  const newCustomersLast30Days =
    await MyGlobal.prisma.shopping_mall_customers.count({
      where: {
        created_at: {
          gte: thirtyDaysAgo,
        },
        deleted_at: null,
      },
    });
  // Query order statistics
  const orderStats = await MyGlobal.prisma.shopping_mall_orders.aggregate({
    _count: true,
    _avg: {
      total_price: true,
    },
    _sum: {
      total_price: true,
    },
    where: {
      deleted_at: null,
    },
  });
  const totalOrders = orderStats._count;
  const averageOrderValue = orderStats._avg.total_price ?? 0;
  const totalRevenue = orderStats._sum.total_price ?? 0;
  const averageOrdersPerActiveCustomer =
    activeCustomers > 0 ? totalOrders / activeCustomers : 0;
  return {
    totalCustomers,
    activeCustomers,
    suspendedCustomers,
    bannedCustomers,
    newCustomersLast30Days,
    totalOrders,
    averageOrderValue,
    totalRevenue,
    averageOrdersPerActiveCustomer,
  };
}
