import { IEcommerceMallDashboard } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallDashboard";
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

export async function getEcommerceMallAdminDashboard(props: {
  admin: AdminPayload;
}): Promise<IEcommerceMallDashboard.ISummary> {
  try {
    const [productsResult, cancellationResult, refundResult, orderItemsResult] =
      await Promise.all([
        MyGlobal.prisma.ecommerce_mall_products.count({
          where: {
            seller_id: props.admin.id,
            deleted_at: null,
          },
        }),
        MyGlobal.prisma.ecommerce_mall_cancellation_requests.count({
          where: {
            seller_id: props.admin.id,
            status: "pending",
          },
        }),
        MyGlobal.prisma.ecommerce_mall_refund_requests.count({
          where: {
            seller_id: props.admin.id,
            status: "pending",
          },
        }),
        MyGlobal.prisma.ecommerce_mall_order_items.count({
          where: {
            seller_id: props.admin.id,
          },
        }),
      ]);
    return {
      totalProducts: productsResult as number & tags.Type<"int32">,
      pendingCancellationRequests: cancellationResult as number &
        tags.Type<"int32">,
      pendingRefundRequests: refundResult as number & tags.Type<"int32">,
      totalOrderItemsSold: orderItemsResult as number & tags.Type<"int32">,
    };
  } catch (error) {
    throw new HttpException(
      error instanceof Error
        ? error.message
        : "Failed to retrieve dashboard statistics",
      500,
    );
  }
}
