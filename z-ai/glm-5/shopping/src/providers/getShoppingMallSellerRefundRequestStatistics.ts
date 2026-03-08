import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IShoppingMallRefundRequestStatistic } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallRefundRequestStatistic";
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

export async function getShoppingMallSellerRefundRequestStatistics(props: {
  seller: SellerPayload;
}): Promise<IShoppingMallRefundRequestStatistic> {
  // Query refund requests grouped by status, filtered by seller through order items
  const statusCounts =
    await MyGlobal.prisma.shopping_mall_refund_requests.groupBy({
      by: ["status"],
      where: {
        orderItem: {
          shopping_mall_seller_id: props.seller.id,
        },
      },
      _count: {
        status: true,
      },
    });
  // Initialize counts
  let pending = 0;
  let approved = 0;
  let rejected = 0;
  // Aggregate counts by status
  for (const record of statusCounts) {
    const count = record._count.status;
    if (record.status === "pending") {
      pending = count;
    } else if (record.status === "approved") {
      approved = count;
    } else if (record.status === "rejected") {
      rejected = count;
    }
  }
  const total = pending + approved + rejected;
  return {
    total,
    pending,
    approved,
    rejected,
  };
}
