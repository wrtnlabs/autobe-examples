import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IShoppingMallReviewReport } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallReviewReport";
import { CustomerPayload } from "../decorators/payload/CustomerPayload";

export async function postShoppingMallCustomerReviewsReviewIdReports(props: {
  customer: CustomerPayload;
  reviewId: string;
  body: IShoppingMallReviewReport;
}): Promise<void> {
  // Verify review exists and is accessible
  const review = await MyGlobal.prisma.shopping_mall_reviews.findUnique({
    where: { id: props.reviewId },
  });
  if (!review) {
    throw new HttpException("Review not found", 404);
  }
  // Verify customer has not already reported this review
  const existingReport =
    await MyGlobal.prisma.shopping_mall_review_reports.findFirst({
      where: {
        review_id: props.reviewId,
        reporter_id: props.customer.id,
      },
    });
  if (existingReport) {
    throw new HttpException("You have already reported this review", 403);
  }
  // Validate reason field
  const body = props.body as any;
  if (!body.reason || body.reason.trim() === "") {
    throw new HttpException("Reason cannot be empty", 400);
  }
  if (body.reason.length > 500) {
    throw new HttpException("Reason cannot exceed 500 characters", 422);
  }
  // Create new review report
  const now = toISOStringSafe(new Date());
  await MyGlobal.prisma.shopping_mall_review_reports.create({
    data: {
      id: v4(),
      review_id: props.reviewId,
      reporter_id: props.customer.id,
      reason: body.reason,
      status: "pending",
      created_at: now,
      updated_at: now,
    },
  });
}
