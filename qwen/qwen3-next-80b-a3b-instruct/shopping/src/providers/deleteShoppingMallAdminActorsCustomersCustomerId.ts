import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { AdminPayload } from "../decorators/payload/AdminPayload";

export async function deleteShoppingMallAdminActorsCustomersCustomerId(props: {
  admin: AdminPayload;
  customerId: string & tags.Format<"uuid">;
}): Promise<void> {
  const { customerId } = props;

  // Ensure the customer exists before attempting deletion
  const customer = await MyGlobal.prisma.shopping_mall_customers.findUnique({
    where: { id: customerId },
    // Do not include non-existent relations: orders, reviews, wishlists, carts
    // Prisma schema does not define these relations on shopping_mall_customers
  });

  if (!customer) {
    throw new HttpException("Customer not found", 404);
  }

  // Perform all deletions in transaction in dependency order
  await MyGlobal.prisma.$transaction([
    // 1. Delete child records that reference customer through their own customer_id
    MyGlobal.prisma.shopping_mall_customer_sessions.deleteMany({
      where: { shopping_mall_customer_id: customerId },
    }),
    MyGlobal.prisma.shopping_mall_carts.deleteMany({
      where: { shopping_mall_customer_id: customerId },
    }),
    MyGlobal.prisma.shopping_mall_wishlists.deleteMany({
      where: { shopping_mall_customer_id: customerId },
    }),
    MyGlobal.prisma.shopping_mall_orders.deleteMany({
      where: { shopping_mall_customer_id: customerId },
    }),
    MyGlobal.prisma.shopping_mall_loyalty_point_transactions.deleteMany({
      where: { customer_id: customerId },
    }),
    MyGlobal.prisma.shopping_mall_loyalty_points.deleteMany({
      where: { customer_id: customerId },
    }),
    MyGlobal.prisma.shopping_mall_notification_preferences.deleteMany({
      where: { actor_id: customerId },
    }),
    MyGlobal.prisma.shopping_mall_audit_logs.deleteMany({
      where: { actor_id: customerId, actor_type: "customer" },
    }),

    // 2. Delete child records referenced through orders and reviews
    // Since customer.orders, customer.reviews, customer.wishlists, customer.carts do not exist,
    // we cannot use them. We remove these complex 'in' clauses with subqueries.
    // We rely instead on direct foreign key deletions above.
    // The parent entities will be deleted in step 3.

    // 3. Delete the parent entities
    MyGlobal.prisma.shopping_mall_reviews.deleteMany({
      where: { shopping_mall_customer_id: customerId },
    }),
    MyGlobal.prisma.shopping_mall_wishlists.deleteMany({
      where: { shopping_mall_customer_id: customerId },
    }),
    MyGlobal.prisma.shopping_mall_carts.deleteMany({
      where: { shopping_mall_customer_id: customerId },
    }),
    MyGlobal.prisma.shopping_mall_orders.deleteMany({
      where: { shopping_mall_customer_id: customerId },
    }),

    // 4. Delete the customer last
    MyGlobal.prisma.shopping_mall_customers.delete({
      where: { id: customerId },
    }),
  ]);

  // Create audit log entry before transaction completes
  await MyGlobal.prisma.shopping_mall_audit_logs.create({
    data: {
      id: v4() as string & tags.Format<"uuid">,
      actor_id: props.admin.id,
      actor_type: "admin",
      event_type: "customer_delete",
      event_details: `Admin ${props.admin.id} permanently deleted customer ${customerId}`,
      status: "success",
      source: "api",
      ip_address: "N/A",
      user_agent: "System-Notification",
      created_at: toISOStringSafe(new Date()) as string &
        tags.Format<"date-time">,
      updated_at: toISOStringSafe(new Date()) as string &
        tags.Format<"date-time">,
    },
  });
}
