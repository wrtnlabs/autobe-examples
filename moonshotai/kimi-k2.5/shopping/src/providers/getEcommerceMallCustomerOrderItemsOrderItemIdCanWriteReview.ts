import { IEcommerceMallReviewEligibility } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallReviewEligibility";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { CustomerPayload } from "../decorators/payload/CustomerPayload";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function getEcommerceMallCustomerOrderItemsOrderItemIdCanWriteReview(props: {
  customer: CustomerPayload;
  orderItemId: string & tags.Format<"uuid">;
}): Promise<IEcommerceMallReviewEligibility> {
  const orderItem = await MyGlobal.prisma.ecommerce_mall_order_items.findUnique(
    {
      where: { id: props.orderItemId },
      select: {
        id: true,
        status: true,
        order: {
          select: {
            id: true,
            customer_id: true,
            status: true,
          },
        },
      },
    },
  );
  if (orderItem === null) {
    throw new HttpException("Order item not found", 404);
  }
  if (orderItem.order.customer_id !== props.customer.id) {
    throw new HttpException(
      "Forbidden: Order item does not belong to customer",
      403,
    );
  }
  if (
    orderItem.status === "cancelled" ||
    orderItem.status === "refunded" ||
    orderItem.order.status === "cancelled"
  ) {
    return {
      eligible: false,
      reason: "ORDER_CANCELLED_OR_REFUNDED",
    };
  }
  if (orderItem.status !== "delivered") {
    return {
      eligible: false,
      reason: "ITEM_NOT_DELIVERED",
    };
  }
  const existingReview = await MyGlobal.prisma.ecommerce_mall_reviews.findFirst(
    {
      where: {
        order_item_id: props.orderItemId,
      },
    },
  );
  if (existingReview !== null) {
    return {
      eligible: false,
      reason: "REVIEW_ALREADY_EXISTS",
    };
  }
  return {
    eligible: true,
    reason: null,
  };
}
