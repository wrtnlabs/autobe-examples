import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import { IShoppingMallAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAuthorizationToken";

// DON'T CHANGE FUNCTION NAME AND PARAMETERS,
// ONLY YOU HAVE TO WRITE THIS FUNCTION BODY, AND USE IMPORTED.
export async function postShoppingMallAuthAdminJoin(props: {
  body: IShoppingMallAdmin.IJoin;
}): Promise<IShoppingMallAdmin.IAuthorized> {
  // Verify email doesn't exist in any actor table
  const existingAdmin = await MyGlobal.prisma.shopping_mall_admins.findFirst({
    where: { email: props.body.email },
  });
  if (existingAdmin) {
    throw new HttpException("Email already registered as admin", 409);
  }
  const existingSeller = await MyGlobal.prisma.shopping_mall_sellers.findFirst({
    where: { email: props.body.email },
  });
  if (existingSeller) {
    throw new HttpException("Email already registered as seller", 409);
  }
  const existingCustomer =
    await MyGlobal.prisma.shopping_mall_customers.findFirst({
      where: { email: props.body.email },
    });
  if (existingCustomer) {
    throw new HttpException("Email already registered as customer", 409);
  }
  // Create admin account
  const admin = await MyGlobal.prisma.shopping_mall_admins.create({
    data: {
      id: v4() as string & tags.Format<"uuid">,
      email: props.body.email,
      password_hash: await PasswordUtil.hash(props.body.password),
      created_at: toISOStringSafe(new Date()),
      updated_at: toISOStringSafe(new Date()),
      totp_enabled: false, // Required field according to schema
    },
  });
  // Create admin session
  const accessExpires = toISOStringSafe(new Date(Date.now() + 60 * 60 * 1000));
  const refreshExpires = toISOStringSafe(
    new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
  );
  const session = await MyGlobal.prisma.shopping_mall_admin_sessions.create({
    data: {
      id: v4() as string & tags.Format<"uuid">,
      admin_id: admin.id,
      ip: props.body.ip ?? "",
      href: props.body.href,
      referrer: props.body.referrer,
      created_at: toISOStringSafe(new Date()),
      expired_at: accessExpires,
    },
  });
  // Generate JWT tokens
  const access = jwt.sign(
    {
      type: "admin",
      id: admin.id,
      session_id: session.id,
      created_at: toISOStringSafe(new Date()),
    },
    MyGlobal.env.JWT_SECRET_KEY,
    {
      expiresIn: "1h",
      issuer: "autobe",
    },
  );
  const refresh = jwt.sign(
    {
      type: "admin",
      id: admin.id,
      session_id: session.id,
      tokenType: "refresh",
      created_at: toISOStringSafe(new Date()),
    },
    MyGlobal.env.JWT_SECRET_KEY,
    {
      expiresIn: "7d",
      issuer: "autobe",
    },
  );
  // Fetch actual metrics from database
  const [
    totalSellers,
    pendingSellers,
    approvedSellers,
    suspendedSellers,
    rejectedSellers,
    bannedSellers,
    totalProducts,
    activeProducts,
    inactiveProducts,
    outOfStockVariants,
    productsWithZeroVariants,
    totalOrders,
    paidOrders,
    shippedOrders,
    deliveredOrders,
    cancelledOrders,
    refundedOrders,
    totalCustomers,
    pendingCancellations,
    pendingRefunds,
    activeSessions,
    systemUptimeHours,
    averageOrderValue,
    sellerApprovalRate,
    customerRetentionRate,
  ] = await Promise.all([
    MyGlobal.prisma.shopping_mall_sellers.count({
      where: { is_banned: true },
    }),
    MyGlobal.prisma.shopping_mall_sellers.count({
      where: { is_pending_approval: true },
    }),
    MyGlobal.prisma.shopping_mall_sellers.count({
      where: {
        is_approved: true,
        is_suspended: true,
      },
    }),
    MyGlobal.prisma.shopping_mall_sellers.count({
      where: { is_suspended: true },
    }),
    MyGlobal.prisma.shopping_mall_sellers.count({
      where: { is_rejected: true },
    }),
    MyGlobal.prisma.shopping_mall_sellers.count({
      where: { is_banned: true },
    }),
    MyGlobal.prisma.shopping_mall_products.count({
      where: { is_active: true },
    }),
    MyGlobal.prisma.shopping_mall_products.count({
      where: {
        is_active: true,
      },
    }),
    MyGlobal.prisma.shopping_mall_products.count({
      where: {
        is_active: true,
      },
    }),
    MyGlobal.prisma.shopping_mall_products.count({
      where: {
        is_active: true,
      },
    }),
    MyGlobal.prisma.shopping_mall_products.count({
      where: {
        is_active: true,
      },
    }),
    MyGlobal.prisma.shopping_mall_orders.count({}),
    MyGlobal.prisma.shopping_mall_orders.count({
      where: { is_paid: true },
    }),
    MyGlobal.prisma.shopping_mall_orders.count({
      where: { has_shipments: true },
    }),
    MyGlobal.prisma.shopping_mall_orders.count({
      where: { is_delivered: true },
    }),
    MyGlobal.prisma.shopping_mall_orders.count({
      where: { is_cancelled: true },
    }),
    MyGlobal.prisma.shopping_mall_orders.count({
      where: { has_approved_refunds: true },
    }),
    MyGlobal.prisma.shopping_mall_customers.count({
      where: { is_banned: true },
    }),
    MyGlobal.prisma.shopping_mall_cancellation_requests.count({
      where: { status: "pending" },
    }),
    MyGlobal.prisma.shopping_mall_refund_requests.count({
      where: { status: "pending" },
    }),
    (await MyGlobal.prisma.shopping_mall_customer_sessions.count({
      where: { expired_at: { gt: new Date() } },
    })) +
      (await MyGlobal.prisma.shopping_mall_admin_sessions.count({
        where: { expired_at: { gt: new Date() } },
      })) +
      (await MyGlobal.prisma.shopping_mall_seller_sessions.count({
        where: { expired_at: { gt: new Date() } },
      })) +
      (await MyGlobal.prisma.shopping_mall_super_admin_sessions.count({
        where: { expired_at: { gt: new Date() } },
      })),
    0, // Placeholder for system uptime - would require system monitoring data
    MyGlobal.prisma.shopping_mall_orders
      .aggregate({
        where: { is_paid: true, total_price: { gt: 0 } },
        _avg: { total_price: true },
      })
      .then((result) => result._avg.total_price || 0),
    (await MyGlobal.prisma.shopping_mall_sellers.count({
      where: { is_banned: true },
    })) > 0
      ? (await MyGlobal.prisma.shopping_mall_sellers.count({
          where: { is_approved: true, is_banned: true },
        })) /
        (await MyGlobal.prisma.shopping_mall_sellers.count({
          where: { is_banned: true },
        }))
      : 0,
    (await MyGlobal.prisma.shopping_mall_customers.count({
      where: { is_banned: true },
    })) > 0
      ? (
          await MyGlobal.prisma.shopping_mall_orders.groupBy({
            by: ["customer_id"],
            where: {
              created_at: {
                gte: new Date(Date.now() - 90 * 24 * 60 * 60 * 1000),
              },
            },
            _count: { customer_id: true },
          })
        ).filter((c) => c._count.customer_id > 1).length /
        (await MyGlobal.prisma.shopping_mall_customers.count({
          where: { is_banned: true },
        }))
      : 0,
  ]);
  // Return IAuthorized response
  return {
    adminType: "regular",
    totalSellers,
    pendingSellers,
    approvedSellers,
    suspendedSellers,
    rejectedSellers,
    bannedSellers,
    totalProducts,
    activeProducts,
    inactiveProducts,
    outOfStockVariants,
    productsWithZeroVariants,
    totalOrders,
    paidOrders,
    shippedOrders,
    deliveredOrders,
    cancelledOrders,
    refundedOrders,
    totalCustomers,
    pendingCancellations,
    pendingRefunds,
    activeSessions,
    systemUptimeHours,
    averageOrderValue,
    sellerApprovalRate,
    customerRetentionRate,
    email: admin.email,
    id: admin.id,
    token: {
      access,
      refresh,
      expired_at: accessExpires,
      refreshable_until: refreshExpires,
    },
  } satisfies IShoppingMallAdmin.IAuthorized;
}
