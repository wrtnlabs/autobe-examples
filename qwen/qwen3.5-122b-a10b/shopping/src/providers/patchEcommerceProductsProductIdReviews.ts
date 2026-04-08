import { IEcommerceCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceCategory";
import { IEcommerceCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceCustomer";
import { IEcommerceProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceProduct";
import { IEcommerceReview } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceReview";
import { IEcommerceSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceSeller";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageIEcommerceReview } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEcommerceReview";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { EcommerceReviewAtSummaryTransformer } from "../transformers/EcommerceReviewAtSummaryTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchEcommerceProductsProductIdReviews(props: {
  productId: string & tags.Format<"uuid">;
  body: IEcommerceReview.IRequest;
}): Promise<IPageIEcommerceReview.ISummary> {
  await MyGlobal.prisma.ecommerce_products.findUniqueOrThrow({
    where: { id: props.productId },
  });
  const includeDeleted = props.body.includeDeleted ?? false;
  const whereInput: Prisma.ecommerce_reviewsWhereInput = {
    product_id: props.productId,
    ...(includeDeleted ? {} : { deleted_at: null }),
    ...(props.body.customer_id && {
      customer_id: props.body.customer_id,
    }),
    ...(props.body.ratingMin !== undefined &&
      props.body.ratingMax !== undefined && {
        rating: {
          gte: props.body.ratingMin,
          lte: props.body.ratingMax,
        },
      }),
    ...((props.body.createdAtFrom || props.body.createdAtTo) && {
      created_at: {
        ...(props.body.createdAtFrom && {
          gte: new Date(props.body.createdAtFrom),
        }),
        ...(props.body.createdAtTo && {
          lte: new Date(props.body.createdAtTo),
        }),
      },
    }),
  };
  let skip: number | undefined;
  let take: number;
  let cursor:
    | {
        id: string;
        created_at: Date;
      }
    | undefined;
  if (props.body.cursor) {
    const decoded = typia.assert<{
      created_at: string;
      id: string;
    }>(JSON.parse(Buffer.from(props.body.cursor, "base64").toString("utf-8")));
    cursor = {
      created_at: new Date(decoded.created_at),
      id: decoded.id,
    };
    take = props.body.limit ?? 20;
  } else {
    const page = props.body.page ?? 1;
    take = Math.min(props.body.limit ?? 20, 100);
    skip = (page - 1) * take;
  }
  const orderByInput: Prisma.ecommerce_reviewsOrderByWithRelationInput =
    props.body.sort === "rating ASC"
      ? { rating: "asc" }
      : props.body.sort === "rating DESC"
        ? { rating: "desc" }
        : props.body.sort === "updated_at DESC"
          ? { updated_at: "desc" }
          : { created_at: "desc" };
  const records = await MyGlobal.prisma.ecommerce_reviews.findMany({
    where: whereInput,
    ...(cursor ? { cursor, skip: 1 } : { skip }),
    take,
    orderBy: orderByInput,
    ...EcommerceReviewAtSummaryTransformer.select(),
  });
  const total = await MyGlobal.prisma.ecommerce_reviews.count({
    where: whereInput,
  });
  const data = await ArrayUtil.asyncMap(
    records,
    EcommerceReviewAtSummaryTransformer.transform,
  );
  const page = props.body.page ?? 1;
  const limit = Math.min(props.body.limit ?? 20, 100);
  const pagination: IPage.IPagination = {
    current: page,
    limit,
    records: total,
    pages: Math.ceil(total / limit),
  };
  return {
    pagination,
    data,
  } satisfies IPageIEcommerceReview.ISummary;
}
