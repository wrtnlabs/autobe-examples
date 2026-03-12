import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IShoppingMallSellerAnalytic } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSellerAnalytic";
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

export async function getShoppingMallAdminAnalyticsSellers(props: {
  admin: AdminPayload;
}): Promise<IShoppingMallSellerAnalytic> {
  const sellers = await MyGlobal.prisma.shopping_mall_sellers.findMany({
    where: {
      deleted_at: null,
    },
    select: {
      id: true,
      shop_name: true,
      approval_status: true,
      created_at: true,
      approvalRequests: {
        where: {
          deleted_at: null,
        },
        orderBy: {
          created_at: "desc",
        },
        take: 1,
        select: {
          status: true,
        },
      },
    },
  });
  if (sellers.length === 0) {
    throw new HttpException("No sellers found", 404);
  }
  const seller = sellers[0];
  const totalOrderItems = await MyGlobal.prisma.shopping_mall_order_items.count(
    {
      where: {
        shopping_mall_seller_id: seller.id,
        deleted_at: null,
      },
    },
  );
  const totalShipments = await MyGlobal.prisma.shopping_mall_shipments.count({
    where: {
      seller_id: seller.id,
      deleted_at: null,
    },
  });
  const completedShipments =
    await MyGlobal.prisma.shopping_mall_shipments.count({
      where: {
        seller_id: seller.id,
        deleted_at: null,
        OR: [{ delivery_confirmed: true }, { delivered_at: { not: null } }],
      },
    });
  const sellerOrderItemIds = (
    await MyGlobal.prisma.shopping_mall_order_items.findMany({
      where: {
        shopping_mall_seller_id: seller.id,
        deleted_at: null,
      },
      select: {
        id: true,
      },
    })
  ).map((item) => item.id);
  const approvedCancellations =
    await MyGlobal.prisma.shopping_mall_cancellation_requests.count({
      where: {
        shopping_mall_order_item_id: {
          in: sellerOrderItemIds,
        },
        status: "approved",
        deleted_at: null,
      },
    });
  const approvedRefunds =
    await MyGlobal.prisma.shopping_mall_refund_requests.count({
      where: {
        shopping_mall_order_item_id: {
          in: sellerOrderItemIds,
        },
        status: "approved",
        deleted_at: null,
      },
    });
  const shipmentCompletionRate =
    totalShipments > 0 ? (completedShipments / totalShipments) * 100 : null;
  const cancellationRate =
    totalOrderItems > 0
      ? (approvedCancellations / totalOrderItems) * 100
      : null;
  const refundRate =
    totalOrderItems > 0 ? (approvedRefunds / totalOrderItems) * 100 : null;
  const approvalStatus =
    seller.approvalRequests[0]?.status ?? seller.approval_status ?? "pending";
  return {
    id: seller.id,
    shopName: seller.shop_name,
    approvalStatus,
    productCount: 0,
    totalOrderItems,
    shipmentCompletionRate,
    cancellationRate,
    refundRate,
    createdAt: toISOStringSafe(seller.created_at),
  } satisfies IShoppingMallSellerAnalytic;
}
