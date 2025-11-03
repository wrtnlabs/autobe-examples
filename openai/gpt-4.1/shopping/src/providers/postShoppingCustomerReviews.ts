import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IShoppingReview } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingReview";
import { IShoppingReviewAttachment } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingReviewAttachment";
import { IShoppingCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingCustomer";
import { IShoppingSku } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingSku";
import { IShoppingReviewModeration } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingReviewModeration";
import { IShoppingReviewAbuseReport } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingReviewAbuseReport";
import { CustomerPayload } from "../decorators/payload/CustomerPayload";

export async function postShoppingCustomerReviews(props: {
  customer: CustomerPayload;
  body: IShoppingReview.ICreate;
}): Promise<IShoppingReview> {
  // 1. Validate eligibility: order line, match, and delivered for customer
  const orderLine = await MyGlobal.prisma.shopping_order_lines.findFirst({
    where: {
      id: props.body.shopping_order_line_id,
      shopping_sku_id: props.body.shopping_sku_id,
      deleted_at: null,
    },
    include: {
      order: true,
    },
  });
  if (
    !orderLine ||
    orderLine.order.shopping_customer_id !== props.customer.id
  ) {
    throw new HttpException(
      "Review not eligible: invalid order line or SKU",
      403,
    );
  }
  if (orderLine.status !== "delivered") {
    throw new HttpException(
      "Review not eligible: order line not delivered",
      400,
    );
  }
  // 2. Enforce uniqueness: one review per (customer, SKU, order line)
  const existing = await MyGlobal.prisma.shopping_reviews.findFirst({
    where: {
      shopping_customer_id: props.customer.id,
      shopping_sku_id: props.body.shopping_sku_id,
      shopping_order_line_id: props.body.shopping_order_line_id,
      deleted_at: null,
    },
  });
  if (existing) {
    throw new HttpException("Duplicate review for this SKU/order line", 409);
  }
  // 3. Insert the review with all required fields
  const now = toISOStringSafe(new Date());
  const review = await MyGlobal.prisma.shopping_reviews.create({
    data: {
      id: v4(),
      shopping_customer_id: props.customer.id,
      shopping_sku_id: props.body.shopping_sku_id,
      shopping_order_line_id: props.body.shopping_order_line_id,
      rating: props.body.rating,
      comment: props.body.comment,
      state: "visible",
      created_at: now,
      updated_at: now,
      deleted_at: null,
    },
  });
  // 4. Handle attachments if present
  let attachments: IShoppingReviewAttachment[] = [];
  if (props.body.attachments && props.body.attachments.length > 0) {
    attachments = await Promise.all(
      props.body.attachments.map(async (a) => {
        const att = await MyGlobal.prisma.shopping_review_attachments.create({
          data: {
            id: v4(),
            shopping_review_id: review.id,
            file_uri: a.file_uri,
            file_type: a.file_type,
            file_size: a.file_size,
            created_at: now,
            deleted_at: null,
          },
        });
        return {
          id: att.id,
          shopping_review_id: att.shopping_review_id,
          file_uri: att.file_uri,
          file_type: att.file_type,
          file_size: att.file_size,
          created_at: toISOStringSafe(att.created_at),
          deleted_at: null,
        };
      }),
    );
  }
  // 5. Build customer summary
  const customer = await MyGlobal.prisma.shopping_customers.findUniqueOrThrow({
    where: { id: props.customer.id },
  });
  // 6. Build sku summary
  const sku = await MyGlobal.prisma.shopping_skus.findUniqueOrThrow({
    where: { id: props.body.shopping_sku_id },
  });
  // 7. Return typed review
  return {
    id: review.id,
    customer: {
      id: customer.id,
      name: customer.name,
      email: customer.email,
      is_active: customer.is_active,
      created_at: toISOStringSafe(customer.created_at),
      deleted_at: customer.deleted_at
        ? toISOStringSafe(customer.deleted_at)
        : null,
    },
    sku: {
      id: sku.id,
      sku_code: sku.sku_code,
      price: sku.price,
      is_active: sku.is_active,
      status: sku.status,
    },
    order_line_id: review.shopping_order_line_id,
    rating: review.rating,
    comment: review.comment,
    state: typia.assert<
      "removed" | "visible" | "pending_moderation" | "under_review"
    >(review.state),
    created_at: toISOStringSafe(review.created_at),
    updated_at: toISOStringSafe(review.updated_at),
    deleted_at:
      review.deleted_at === null
        ? undefined
        : toISOStringSafe(review.deleted_at),
    attachments,
    moderation: undefined,
    abuse_reports: undefined,
  };
}
