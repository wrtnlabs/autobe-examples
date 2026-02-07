import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageIShoppingMallReview } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallReview";
import { IShoppingMallReview } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallReview";
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
  body: IShoppingMallReview.IRequest;
}): Promise<IPageIShoppingMallReview.ISummary> {
  // Type assertion to access pagination parameters as per operation specification
  // This is necessary because the IRequest type is incorrectly defined as empty
  // while the operation specification requires page and limit properties.
  const bodyWithPagination = props.body as any;
  const page = bodyWithPagination.page ?? 1;
  const limit = bodyWithPagination.limit ?? 100;
  const skip = (page - 1) * limit;
  // Query database using schema and specification
  const where: Prisma.shopping_mall_reviewsWhereInput = {
    deleted_at: null,
  } satisfies Prisma.shopping_mall_reviewsWhereInput;
  const data = await MyGlobal.prisma.shopping_mall_reviews.findMany({
    where,
    skip,
    take: limit,
    orderBy: { created_at: "desc" },
  });
  const total = await MyGlobal.prisma.shopping_mall_reviews.count({ where });
  // Return empty object array per IShoppingMallReview.ISummary = {}
  const emptyReviewArray: {}[] = data.map(() => ({}));
  return {
    data: emptyReviewArray,
    pagination: {
      current: page satisfies number & tags.Type<"int32"> & tags.Minimum<0>,
      limit: limit satisfies number & tags.Type<"int32"> & tags.Minimum<0>,
      records: total satisfies number & tags.Type<"int32"> & tags.Minimum<0>,
      pages: Math.ceil(total / limit) satisfies number &
        tags.Type<"int32"> &
        tags.Minimum<0>,
    } satisfies IPage.IPagination,
  };
}
