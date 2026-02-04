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
import { ShoppingMallReviewReportTransformer } from "../transformers/ShoppingMallReviewReportTransformer";

export async function getShoppingMallCustomerReviewsReviewIdReports(props: {
  customer: CustomerPayload;
  reviewId: string;
}): Promise<IShoppingMallReviewReport[]> {
  const reports = await MyGlobal.prisma.shopping_mall_review_reports.findMany({
    where: {
      review_id: props.reviewId,
    },
    orderBy: {
      created_at: "asc",
    },
    ...ShoppingMallReviewReportTransformer.select(),
  });
  return await ArrayUtil.asyncMap(
    reports,
    ShoppingMallReviewReportTransformer.transform,
  );
}
