import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IShoppingMallSellerDashboard } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSellerDashboard";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { MemberPayload } from "../decorators/payload/MemberPayload";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function getShoppingMallMemberDashboard(props: {
  member: MemberPayload;
}): Promise<IShoppingMallSellerDashboard> {
  const seller = await MyGlobal.prisma.shopping_mall_sellers.findFirst({
    where: {
      id: props.member.id,
      approval_status: "approved",
      deleted_at: null,
    },
  });
  if (!seller) {
    throw new HttpException("Seller account not found or not approved", 403);
  }
  const productCount = await MyGlobal.prisma.shopping_mall_products.count({
    where: {
      shopping_mall_seller_id: seller.id,
      deleted_at: null,
    },
  });
  const orderItemCount = await MyGlobal.prisma.shopping_mall_order_items.count({
    where: {
      shopping_mall_seller_id: seller.id,
    },
  });
  const pendingCancellationCount =
    await MyGlobal.prisma.shopping_mall_cancellation_requests.count({
      where: {
        status: "pending",
        orderItem: {
          shopping_mall_seller_id: seller.id,
        },
        deleted_at: null,
      },
    });
  const pendingRefundCount =
    await MyGlobal.prisma.shopping_mall_refund_requests.count({
      where: {
        status: "pending",
        orderItem: {
          shopping_mall_seller_id: seller.id,
        },
        deleted_at: null,
      },
    });
  return {
    product_count: productCount,
    order_item_count: orderItemCount,
    pending_cancellation_count: pendingCancellationCount,
    pending_refund_count: pendingRefundCount,
  };
}
