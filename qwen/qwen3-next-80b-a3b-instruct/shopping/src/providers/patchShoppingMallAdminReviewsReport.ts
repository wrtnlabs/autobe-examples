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
import { AdminPayload } from "../decorators/payload/AdminPayload";

export async function patchShoppingMallAdminReviewsReport(props: {
  admin: AdminPayload;
  body: IShoppingMallReviewReport.IRequest;
}): Promise<IShoppingMallReviewReport.IResponse> {
  // Verify review exists
  const existingReview = await MyGlobal.prisma.shopping_mall_reviews.findUnique(
    {
      where: { id: props.body.review_id },
    },
  );
  if (!existingReview) {
    throw new HttpException("Review not found", 404);
  }
  // Check if this admin has already reported this review
  const existingReport =
    await MyGlobal.prisma.shopping_mall_review_reports.findFirst({
      where: {
        review_id: props.body.review_id,
        reporter_id: props.admin.id,
      },
    });
  if (existingReport) {
    throw new HttpException("You have already reported this review", 409);
  }
  // Create new review report
  const createdAt = toISOStringSafe(new Date()) as string &
    tags.Format<"date-time">;
  await MyGlobal.prisma.shopping_mall_review_reports.create({
    data: {
      id: v4() as string & tags.Format<"uuid">,
      review_id: props.body.review_id,
      reporter_id: props.admin.id,
      reason: props.body.reason,
      created_at: createdAt,
      updated_at: createdAt,
      status: "pending" as const,
    },
  });
  return { success: true };
}
