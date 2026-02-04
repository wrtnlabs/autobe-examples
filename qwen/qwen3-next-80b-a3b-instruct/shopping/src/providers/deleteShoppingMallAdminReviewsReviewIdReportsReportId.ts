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
import { AdminPayload } from "../decorators/payload/AdminPayload";

export async function deleteShoppingMallAdminReviewsReviewIdReportsReportId(props: {
  admin: AdminPayload;
  reviewId: string;
  reportId: string;
}): Promise<void> {
  const report = await MyGlobal.prisma.shopping_mall_review_reports.findUnique({
    where: {
      review: {
        id: props.reviewId,
      },
      reporter: {
        id: props.reportId,
      },
    },
  });
  if (!report) {
    throw new HttpException("Review report not found", 404);
  }
  await MyGlobal.prisma.shopping_mall_review_reports.delete({
    where: {
      review: {
        id: props.reviewId,
      },
      reporter: {
        id: props.reportId,
      },
    },
  });
}
