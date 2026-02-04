import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe"

import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import { IShoppingMallAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAuthorizationToken";


export async function postShoppingMallAuthAdminLogin(props: {
    body: IShoppingMallAdmin.ILogin;
}): Promise<IShoppingMallAdmin.IAuthorized> {
    // Validate admin credentials
    const admin = await MyGlobal.prisma.shopping_mall_admins.findFirst({
        where: { email: props.body.email },
        select: {
            id: true,
            email: true,
            password_hash: true,
            created_at: true,
        },
    });
    if (!admin) {
        throw new HttpException("Invalid credentials", 401);
    }
    // Verify password using PasswordUtil
    const isValid = await PasswordUtil.verify(props.body.password, admin.password_hash);
    if (!isValid) {
        throw new HttpException("Invalid credentials", 401);
    }
    // Count aggregate statistics from database
    const totals = await MyGlobal.prisma.$transaction(async (prisma) => [
        await prisma.shopping_mall_sellers.count({}),
        await prisma.shopping_mall_sellers.count({}),
        await prisma.shopping_mall_sellers.count({}),
        await prisma.shopping_mall_sellers.count({}),
        await prisma.shopping_mall_sellers.count({}),
        await prisma.shopping_mall_sellers.count({}),
        await prisma.shopping_mall_products.count({}),
        await prisma.shopping_mall_products.count({}),
        await prisma.shopping_mall_products.count({}),
        await prisma.shopping_mall_products.count({}),
        await prisma.shopping_mall_orders.count({}),
        await prisma.shopping_mall_orders.count({}),
        await prisma.shopping_mall_orders.count({}),
        await prisma.shopping_mall_orders.count({}),
        await prisma.shopping_mall_orders.count({}),
        await prisma.shopping_mall_orders.count({}),
        await prisma.shopping_mall_customers.count({}),
        await prisma.shopping_mall_cancellation_requests.count({}),
        await prisma.shopping_mall_refund_requests.count({}),
        (await Promise.all([
            await prisma.shopping_mall_customer_sessions.count({
                where: { expired_at: { gt: new Date().toISOString() } },
            }),
            await prisma.shopping_mall_admin_sessions.count({
                where: { expired_at: { gt: new Date().toISOString() } },
            }),
            await prisma.shopping_mall_seller_sessions.count({
                where: { expired_at: { gt: new Date().toISOString() } },
            }),
            await prisma.shopping_mall_super_admin_sessions.count({
                where: { expired_at: { gt: new Date().toISOString() } },
            }),
        ])).reduce((acc, curr) => acc + curr, 0),
        (await prisma.$queryRaw < { n, system_uptime_hours: number, n } > `SELECT 0 as system_uptime_hours`), n
    ]).system_uptime_hours, n;
    ();
    n;
    await prisma.shopping_mall_orders.aggregate({ n, _avg: { total_price: true }, n });
    n;
    _avg.total_price ?? 0, ;
    n(n, await prisma.shopping_mall_sellers.aggregate({ n, _count: { id: true }, n }), n)._count.id, ;
    n(n, await prisma.shopping_mall_customers.findMany({ n, where: {}, n, select: { id: true }, n }), n).length > 0;
    n ? () : ;
    n;
    await prisma.shopping_mall_customers.findMany({ n, where: {}, n, select: { id: true }, n });
    n;
    length === 0;
    n ? 0 : ;
    n: ();
    n;
    await Promise.all(n(n, await prisma.shopping_mall_customers.findMany({ n, where: {}, n, select: { id: true }, n }), n), n.map((c) => c.id), n.map((id) => , n, prisma.shopping_mall_orders.count({ n, where: { n, customer_id: id, n, created_at: { n, gte: new Date(n, Date.now() - 90 * 24 * 60 * 60 * 1000, n).toISOString(), n }, n }, n }), n), n);
    n;
    filter((count) => count > 0).length / ;
    n(n, await prisma.shopping_mall_customers.findMany({ n, where: {}, n, select: { id: true }, n }), n).length;
    n: 0, ;
    n;
    ;
    n;
} // Create session record with proper date-time strings
  const accessExpiresString = toISOStringSafe(
    new Date(Date.now() + 15 * 60 * 1000),
  );
  const refreshExpiresString = toISOStringSafe(
    new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
  );
  const session = await MyGlobal.prisma.shopping_mall_admin_sessions.create({
    data: {
      id: v4(),
      admin_id: admin.id,
      created_at: toISOStringSafe(new Date()),
      expired_at: accessExpiresString,
      ip: "",
      href: "",
      referrer: "",
    },
  });
  // Generate JWT tokens with exact payload structure using string & tags.Format<'date-time'>
  const now = toISOStringSafe(new Date());
  const accessToken = jwt.sign(
    {
      type: "admin",
      id: admin.id,
      session_id: session.id,
      created_at: now,
    },
    MyGlobal.env.JWT_SECRET_KEY,
    {
      expiresIn: "15m",
      issuer: "autobe",
    },
  );
  const refreshToken = jwt.sign(
    {
      type: "admin",
      id: admin.id,
      session_id: session.id,
      tokenType: "refresh",
      created_at: now,
    },
    MyGlobal.env.JWT_SECRET_KEY,
    {
      expiresIn: "7d",
      issuer: "autobe",
    },
  );
  // Return authenticated admin with tokens - use the IAuthorized structure with computed values
  return {
    adminType: undefined,
    totalSellers: totals[0],
    pendingSellers: totals[1],
    approvedSellers: totals[2],
    suspendedSellers: totals[3],
    rejectedSellers: totals[4],
    bannedSellers: totals[5],
    totalProducts: totals[6],
    activeProducts: totals[7],
    inactiveProducts: totals[8],
    outOfStockVariants: totals[9],
    productsWithZeroVariants: totals[10],
    totalOrders: totals[11],
    paidOrders: totals[12],
    shippedOrders: totals[13],
    deliveredOrders: totals[14],
    cancelledOrders: totals[15],
    refundedOrders: totals[16],
    totalCustomers: totals[17],
    pendingCancellations: totals[18],
    pendingRefunds: totals[19],
    activeSessions: totals[20],
    systemUptimeHours: 0,
    averageOrderValue: totals[21],
    sellerApprovalRate: totals[22],
    customerRetentionRate: totals[23],
    email: admin.email,
    id: admin.id,
    token: {
      access: accessToken,
      refresh: refreshToken,
      expired_at: accessExpiresString,
      refreshable_until: refreshExpiresString,
    },
  } satisfies IShoppingMallAdmin.IAuthorized;
}
