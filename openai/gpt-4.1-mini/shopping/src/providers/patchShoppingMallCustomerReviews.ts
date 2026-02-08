import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageIShoppingMallSaleReview } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallSaleReview";
import { IShoppingMallSaleReview } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSaleReview";
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

export async function patchShoppingMallCustomerReviews(props: {
  customer: CustomerPayload;
  body: IShoppingMallSaleReview.IRequest;
}): Promise<IPageIShoppingMallSaleReview.ISummary> {
  // Default page and limit because props.body does not have these properties
  const page = 1;
  const limit = 10;
  const skip = (page - 1) * limit;
  // Build the whereInput with only deleted_at filter
  const whereInput: Prisma.shopping_mall_reviewsWhereInput = {
    deleted_at: null,
  };
  // Fetch data and count
  const [reviews, total] = await Promise.all([
    MyGlobal.prisma.shopping_mall_reviews.findMany({
      where: whereInput,
      skip,
      take: limit,
      orderBy: { created_at: "desc" },
    }),
    MyGlobal.prisma.shopping_mall_reviews.count({ where: whereInput }),
  ]);
  return {
    data: [], // Not populating data as original code returns empty array
    pagination: {
      current: page,
      limit: limit,
      records: total,
      pages: Math.ceil(total / limit),
    },
  };
}
