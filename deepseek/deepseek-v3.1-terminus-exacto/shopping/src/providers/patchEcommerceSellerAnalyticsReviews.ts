import { IEcommerceCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceCustomer";
import { IEcommerceReview } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceReview";
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
import { SellerPayload } from "../decorators/payload/SellerPayload";
import { EcommerceReviewAtSummaryTransformer } from "../transformers/EcommerceReviewAtSummaryTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchEcommerceSellerAnalyticsReviews(props: {
  seller: SellerPayload;
  body: IEcommerceReview.IRequest;
}): Promise<IPageIEcommerceReview.ISummary> {
  const page = props.body.page ?? 1;
  const limit = props.body.limit ?? 20;
  const skip = (page - 1) * limit;
  // Build where condition for seller's products and filters
  const whereInput = {
    product: {
      ecommerce_seller_id: props.seller.id,
      deleted_at: null,
    },
    deleted_at: null,
    ...(props.body.search && {
      content: {
        contains: props.body.search,
        mode: "insensitive" as const,
      },
    }),
    ...(props.body.ratings &&
      props.body.ratings.length > 0 && {
        rating: { in: props.body.ratings },
      }),
    ...(props.body.start_date && {
      created_at: { gte: new Date(props.body.start_date) },
    }),
    ...(props.body.end_date && {
      created_at: { lte: new Date(props.body.end_date) },
    }),
    ...(props.body.updated_start && {
      updated_at: { gte: new Date(props.body.updated_start) },
    }),
    ...(props.body.updated_end && {
      updated_at: { lte: new Date(props.body.updated_end) },
    }),
    ...(props.body.ecommerce_product_id && {
      product: {
        id: props.body.ecommerce_product_id,
        ecommerce_seller_id: props.seller.id,
        deleted_at: null,
      },
    }),
  } satisfies Prisma.ecommerce_reviewsWhereInput;
  // Build orderBy - handle helpful votes with proper join
  const orderByInput: Record<string, "asc" | "desc"> = {};
  if (props.body.sort_by && props.body.sort_by !== "helpful_votes") {
    const sortField = props.body.sort_by;
    const sortOrder = props.body.sort_order === "asc" ? "asc" : "desc";
    orderByInput[sortField] = sortOrder;
  }
  // Default ordering
  if (Object.keys(orderByInput).length === 0) {
    orderByInput.created_at = "desc";
  }
  // Handle helpful votes sorting differently
  let reviewsQuery;
  if (props.body.sort_by === "helpful_votes") {
    reviewsQuery = MyGlobal.prisma.ecommerce_reviews.findMany({
      where: whereInput,
      skip,
      take: limit,
      select: {
        id: true,
        rating: true,
        content: true,
        created_at: true,
        customer: {
          select: {
            id: true,
            email: true,
            display_name: true,
            created_at: true,
          },
        },
        helpfulVotes: {
          select: { id: true },
        },
      },
      orderBy: [
        {
          helpfulVotes: {
            _count: props.body.sort_order === "asc" ? "asc" : "desc",
          },
        },
        { created_at: "desc" },
      ],
    });
  } else {
    reviewsQuery = MyGlobal.prisma.ecommerce_reviews.findMany({
      where: whereInput,
      skip,
      take: limit,
      orderBy: orderByInput,
      ...EcommerceReviewAtSummaryTransformer.select(),
    });
  }
  const [reviews, total] = await Promise.all([
    reviewsQuery,
    MyGlobal.prisma.ecommerce_reviews.count({
      where: whereInput,
    }),
  ]);
  // Extract just the review data if we included helpful votes
  const reviewData = reviews;
  const transformedReviews = await ArrayUtil.asyncMap(
    reviewData as any,
    EcommerceReviewAtSummaryTransformer.transform,
  );
  return {
    data: transformedReviews,
    pagination: {
      current: page,
      limit: limit,
      records: total,
      pages: Math.ceil(total / limit),
    } satisfies IPage.IPagination,
  };
}
