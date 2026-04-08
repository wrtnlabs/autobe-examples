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
  // Fetch order item with its order to verify ownership and status
  const orderItem =
    await MyGlobal.prisma.ecommerce_mall_order_items.findUniqueOrThrow({
      where: { id: props.orderItemId },
      select: {
        id: true,
        status: true,
        order: {
          select: {
            customer_id: true,
          },
        },
        review: {
          select: { id: true },
        },
      },
    });
  // Verify ownership - customer must own the order containing this item
  if (orderItem.order.customer_id !== props.customer.id) {
    throw new HttpException("Forbidden", 403);
  }
  // Check if order item status allows review submission
  if (orderItem.status === "cancelled" || orderItem.status === "refunded") {
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
  // Check if review already exists for this order item
  if (orderItem.review !== null) {
    return {
      eligible: false,
      reason: "REVIEW_ALREADY_EXISTS",
    };
  }
  // All checks passed - customer can write a review
  return {
    eligible: true,
    reason: null,
  };
}


//--------------------------------------------------------------
// TEMPLATE CODE
//--------------------------------------------------------------
// Complete the code below, disregard the import part and return only the function part.
// 
// ```typescript
// import { ArrayUtil } from "@nestia/e2e";
// import { HttpException } from "@nestjs/common";
// import { Prisma } from "@prisma/sdk";
// import jwt from "jsonwebtoken";
// import typia, { tags } from "typia";
// import { v4 } from "uuid";
// import { MyGlobal } from "../MyGlobal";
// import { PasswordUtil } from "../utils/PasswordUtil";
// import { toISOStringSafe } from "../utils/toISOStringSafe"
// 
// import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
// import { IEcommerceMallReviewEligibility } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallReviewEligibility";
// 
// // DON'T CHANGE FUNCTION NAME AND PARAMETERS,
// // ONLY YOU HAVE TO WRITE THIS FUNCTION BODY, AND USE IMPORTED.
// export async function getEcommerceMallCustomerOrderItemsOrderItemIdCanWriteReview(props: {
//   customer: CustomerPayload;
//   orderItemId: string & tags.Format<"uuid">;
// }): Promise<IEcommerceMallReviewEligibility> {
//   // No matching Collector/Transformer found for this operation.
//     // You MUST call getDatabaseSchemas first to get exact relation property names.
//     // NEVER guess relation names from table names — always verify against the schema.
//     ...
// }
// ```
//--------------------------------------------------------------