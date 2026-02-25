import { IEcommerceCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceCustomer";
import { IEcommerceReview } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceReview";
import { IEcommerceReviewReport } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceReviewReport";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { EcommerceReviewReportCollector } from "../collectors/EcommerceReviewReportCollector";
import { CustomerPayload } from "../decorators/payload/CustomerPayload";
import { EcommerceReviewReportTransformer } from "../transformers/EcommerceReviewReportTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

// DON'T CHANGE FUNCTION NAME AND PARAMETERS,
// ONLY YOU HAVE TO WRITE THIS FUNCTION BODY, AND USE IMPORTED.
export async function postEcommerceCustomerProductsProductIdReviewsReviewIdReports(props: {
  customer: CustomerPayload;
  productId: string & tags.Format<"uuid">;
  reviewId: string & tags.Format<"uuid">;
  body: IEcommerceReviewReport.ICreate;
}): Promise<IEcommerceReviewReport> {
  // Validate review exists and belongs to product using purchase verification
  const orderItem = await MyGlobal.prisma.ecommerce_order_items.findFirst({
    where: {
      productVariant: {
        product: {
          id: props.productId,
          deleted_at: null,
        },
      },
      order: {
        customer_id: props.customer.id,
        deleted_at: null,
      },
      status: "delivered",
    },
    select: { id: true },
  });
  if (!orderItem) {
    throw new HttpException(
      "Product not found or not delivered to customer",
      404,
    );
  }
  const review = await MyGlobal.prisma.ecommerce_reviews.findFirst({
    where: {
      id: props.reviewId,
      orderItem: {
        productVariant: {
          product: {
            id: props.productId,
          },
        },
      },
      deleted_at: null,
    },
    select: { id: true },
  });
  if (!review) {
    throw new HttpException(
      "Review not found or does not belong to product",
      404,
    );
  }
  // Check unique constraint (customer can only report review once)
  const existingReport =
    await MyGlobal.prisma.ecommerce_review_reports.findFirst({
      where: {
        customer_id: props.customer.id,
        review_id: props.reviewId,
        deleted_at: null,
      },
    });
  if (existingReport) {
    throw new HttpException("You have already reported this review", 409);
  }
  // Create review report using collector + transformer pattern
  const created = await MyGlobal.prisma.ecommerce_review_reports.create({
    data: await EcommerceReviewReportCollector.collect({
      body: props.body,
      customer: { id: props.customer.id },
      review: { id: props.reviewId },
    }),
    ...EcommerceReviewReportTransformer.select(),
  });
  return await EcommerceReviewReportTransformer.transform(created);
}
