import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IPageIShoppingMallReviewModerationLog } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallReviewModerationLog";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IShoppingMallReviewModerationLog } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallReviewModerationLog";
import { CustomerPayload } from "../decorators/payload/CustomerPayload";

export async function getShoppingMallCustomerReviewsReviewIdModerationLogs(props: {
  customer: CustomerPayload;
  reviewId: string;
}): Promise<IPageIShoppingMallReviewModerationLog> {
  const page = 1;
  const limit = 50;
  const skip = (page - 1) * limit;

  const logs =
    await MyGlobal.prisma.shopping_mall_review_moderation_logs.findMany({
      where: {
        shopping_mall_review_id: props.reviewId,
      },
      orderBy: {
        created_at: "asc",
      },
      skip,
      take: limit,
    });

  const total =
    await MyGlobal.prisma.shopping_mall_review_moderation_logs.count({
      where: {
        shopping_mall_review_id: props.reviewId,
      },
    });

  // Since IShoppingMallReviewModerationLog is defined as string, we return only the id field as string
  const data = logs.map((log) => log.id);

  const pagination: IPage.IPagination = {
    current: page,
    limit,
    records: total,
    pages: Math.ceil(total / limit),
  };

  return {
    pagination,
    data,
  };
}
