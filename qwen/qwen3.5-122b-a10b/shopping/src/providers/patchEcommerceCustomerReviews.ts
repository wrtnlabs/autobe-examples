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
import { CustomerPayload } from "../decorators/payload/CustomerPayload";
import { EcommerceReviewAtSummaryTransformer } from "../transformers/EcommerceReviewAtSummaryTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchEcommerceCustomerReviews(props: {
  customer: CustomerPayload;
  body: IEcommerceReview.IRequest;
}): Promise<IPageIEcommerceReview.ISummary> {
  const body = props.body;
  // Validate rating range
  if (body.ratingMin !== undefined) {
    if (body.ratingMin < 1 || body.ratingMin > 5) {
      throw new HttpException("ratingMin must be between 1 and 5", 400);
    }
  }
  if (body.ratingMax !== undefined) {
    if (body.ratingMax < 1 || body.ratingMax > 5) {
      throw new HttpException("ratingMax must be between 1 and 5", 400);
    }
  }
  if (
    body.ratingMin !== undefined &&
    body.ratingMax !== undefined &&
    body.ratingMin > body.ratingMax
  ) {
    throw new HttpException("ratingMin cannot be greater than ratingMax", 400);
  }
  // Validate limit
  const limit: number = body.limit ?? 20;
  if (limit < 1 || limit > 100) {
    throw new HttpException("limit must be between 1 and 100", 400);
  }
  // Validate page
  const page: number = body.page ?? 1;
  if (page < 1) {
    throw new HttpException("page must be at least 1", 400);
  }
  // Parse cursor
  let cursor: {
    created_at: Date;
    id: string;
  } | null = null;
  if (body.cursor) {
    try {
      const decoded: string = Buffer.from(body.cursor, "base64").toString(
        "utf-8",
      );
      const parts: string[] = decoded.split("|");
      if (parts.length !== 2) {
        throw new Error("Invalid cursor format");
      }
      cursor = {
        created_at: new Date(parts[0]),
        id: parts[1],
      };
    } catch {
      throw new HttpException("Invalid cursor format", 400);
    }
  }
  // Build where clause
  const whereInput: Prisma.ecommerce_reviewsWhereInput = {
    deleted_at: body.includeDeleted ? undefined : null,
    ...(body.product_id !== undefined && { product_id: body.product_id }),
    ...(body.customer_id !== undefined && { customer_id: body.customer_id }),
    ...(body.ratingMin !== undefined &&
      body.ratingMax !== undefined && {
        rating: {
          gte: body.ratingMin,
          lte: body.ratingMax,
        },
      }),
    ...(body.createdAtFrom !== undefined && {
      created_at: {
        gte: new Date(body.createdAtFrom),
      },
    }),
    ...(body.createdAtTo !== undefined && {
      created_at: {
        ...(body.createdAtFrom !== undefined
          ? { gte: new Date(body.createdAtFrom) }
          : {}),
        lte: new Date(body.createdAtTo),
      },
    }),
    ...(cursor !== null && {
      OR: [
        { created_at: { lt: cursor.created_at } },
        {
          created_at: cursor.created_at,
          id: { lt: cursor.id },
        },
      ],
    }),
  };
  // Build orderBy
  const orderByInput: Prisma.ecommerce_reviewsOrderByWithRelationInput =
    body.sort === "rating ASC"
      ? { rating: "asc" }
      : body.sort === "rating DESC"
        ? { rating: "desc" }
        : body.sort === "updated_at DESC"
          ? { updated_at: "desc" }
          : { created_at: "desc" };
  // Fetch records with extra for hasNext check
  const records = await MyGlobal.prisma.ecommerce_reviews.findMany({
    where: whereInput,
    orderBy: orderByInput,
    take: limit + 1,
    ...EcommerceReviewAtSummaryTransformer.select(),
  });
  // Check if there are more records
  const hasNext: boolean = records.length > limit;
  if (hasNext) {
    records.pop();
  }
  // Count total
  const total: number = await MyGlobal.prisma.ecommerce_reviews.count({
    where: whereInput,
  });
  // Calculate pagination
  const current: number = page;
  const pages: number = total > 0 ? Math.ceil(total / limit) : 0;
  // Generate next cursor
  const nextCursor: string | null =
    hasNext && records.length > 0
      ? Buffer.from(
          `${records[records.length - 1].created_at.toISOString()}|${records[records.length - 1].id}`,
        ).toString("base64")
      : null;
  // Transform records
  const data = await ArrayUtil.asyncMap(
    records,
    EcommerceReviewAtSummaryTransformer.transform,
  );
  return {
    pagination: {
      current,
      limit,
      records: total,
      pages,
    },
    data,
  };
}
