import { IEcommerceMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCategory";
import { IEcommerceMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCustomer";
import { IEcommerceMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProduct";
import { IEcommerceMallReview } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallReview";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageIEcommerceMallReview } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEcommerceMallReview";
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

export async function patchEcommerceMallCustomerReviews(props: {
  customer: CustomerPayload;
  body: IEcommerceMallReview.IRequest;
}): Promise<IPageIEcommerceMallReview.ISummary> {
  const page = props.body.page ?? 1;
  const limit = props.body.limit ?? 100;
  const skip = (page - 1) * limit;
  // Validate pagination bounds
  if (page < 1) {
    throw new HttpException("Page must be at least 1", 400);
  }
  if (limit < 1 || limit > 100) {
    throw new HttpException("Limit must be between 1 and 100", 400);
  }
  // Validate rating range if provided
  if (props.body.min_rating !== undefined) {
    if (props.body.min_rating < 1 || props.body.min_rating > 5) {
      throw new HttpException("min_rating must be between 1 and 5", 400);
    }
  }
  if (props.body.max_rating !== undefined) {
    if (props.body.max_rating < 1 || props.body.max_rating > 5) {
      throw new HttpException("max_rating must be between 1 and 5", 400);
    }
  }
  // Validate sort_by enum
  const validSortByValues: Array<"created_at" | "rating"> = [
    "created_at",
    "rating",
  ];
  if (
    props.body.sort_by !== undefined &&
    !validSortByValues.includes(props.body.sort_by)
  ) {
    throw new HttpException("sort_by must be created_at or rating", 400);
  }
  // Validate direction enum
  const validDirectionValues: Array<"asc" | "desc"> = ["asc", "desc"];
  if (
    props.body.direction !== undefined &&
    !validDirectionValues.includes(props.body.direction)
  ) {
    throw new HttpException("direction must be asc or desc", 400);
  }
  // Build WHERE clause for non-deleted reviews
  const whereInput: Prisma.ecommerce_mall_reviewsWhereInput = {
    deleted_at: null,
    // Row-level security: customers can only filter by their own customer_id
    ...(props.body.customer_id && {
      customer_id: props.body.customer_id,
    }),
    ...(props.body.product_id && {
      product_id: props.body.product_id,
    }),
    ...(props.body.order_id && {
      order_id: props.body.order_id,
    }),
    ...(props.body.min_rating !== undefined && {
      rating: {
        gte: props.body.min_rating,
      },
    }),
    ...(props.body.max_rating !== undefined && {
      rating: {
        lte: props.body.max_rating,
      },
    }),
    ...(props.body.is_verified_purchase !== undefined && {
      is_verified_purchase: props.body.is_verified_purchase,
    }),
    ...(props.body.from_created_at && {
      created_at: {
        gte: new Date(props.body.from_created_at),
      },
    }),
    ...(props.body.to_created_at && {
      created_at: {
        lte: new Date(props.body.to_created_at),
      },
    }),
    // Text search using ILIKE (PostgreSQL text search)
    ...(props.body.search && {
      OR: [
        { title: { contains: props.body.search } },
        { body: { contains: props.body.search } },
      ],
    }),
  };
  // Determine sorting
  const sortBy = props.body.sort_by ?? "created_at";
  const direction = props.body.direction ?? "desc";
  const orderByInput: Prisma.ecommerce_mall_reviewsOrderByWithRelationInput[] =
    sortBy === "rating"
      ? [
          { rating: direction as "asc" | "desc" },
          { created_at: direction as "asc" | "desc" },
        ]
      : [
          { created_at: direction as "asc" | "desc" },
          { id: direction as "asc" | "desc" },
        ];
  // Apply cursor-based pagination for deterministic ordering
  if (props.body.cursor) {
    const cursorParts = props.body.cursor.split("|");
    if (cursorParts.length === 2) {
      const cursorCreatedAt = cursorParts[0] as string &
        tags.Format<"date-time">;
      const cursorId = cursorParts[1] as string & tags.Format<"uuid">;
      if (direction === "desc") {
        whereInput.OR = [
          {
            AND: [{ created_at: { lt: new Date(cursorCreatedAt) } }],
          },
          {
            AND: [
              { created_at: { equals: new Date(cursorCreatedAt) } },
              { id: { lt: cursorId } },
            ],
          },
        ];
      } else {
        whereInput.OR = [
          {
            AND: [{ created_at: { gt: new Date(cursorCreatedAt) } }],
          },
          {
            AND: [
              { created_at: { equals: new Date(cursorCreatedAt) } },
              { id: { gt: cursorId } },
            ],
          },
        ];
      }
    }
  }
  // Query reviews with helpfulness vote count
  const reviews = await MyGlobal.prisma.ecommerce_mall_reviews.findMany({
    where: whereInput,
    skip,
    take: limit,
    orderBy: orderByInput,
    include: {
      customer: {
        select: {
          id: true,
          email: true,
          status: true,
          created_at: true,
          deleted_at: true,
        },
      },
      product: {
        select: {
          id: true,
          name: true,
          base_price: true,
          slug: true,
          status: true,
          category: {
            select: {
              id: true,
              name: true,
              slug: true,
              parent_id: true,
              display_order: true,
              is_active: true,
              parent: {
                select: {
                  id: true,
                  name: true,
                  slug: true,
                  parent_id: true,
                  display_order: true,
                  is_active: true,
                },
              },
            },
          },
          deleted_at: true,
        },
      },
      helpfulnessVotes: {
        where: {
          deleted_at: null,
        },
      },
    },
  });
  // Count total for pagination metadata
  const total = await MyGlobal.prisma.ecommerce_mall_reviews.count({
    where: whereInput,
  });
  // Transform and calculate helpfulness counts
  const data = await ArrayUtil.asyncMap(reviews, async (review) => {
    const helpfulnessVoteCount = review.helpfulnessVotes.filter(
      (vote) => vote.helpfulness === true,
    ).length;
    return {
      id: review.id as string & tags.Format<"uuid">,
      customer: {
        id: review.customer.id as string & tags.Format<"uuid">,
        email: review.customer.email as string & tags.Format<"email">,
        status: review.customer.status,
        created_at: review.customer.created_at.toISOString(),
        deleted_at: review.customer.deleted_at?.toISOString() ?? null,
      } satisfies IEcommerceMallCustomer.ISummary,
      product: {
        id: review.product.id as string & tags.Format<"uuid">,
        name: review.product.name,
        base_price: review.product.base_price,
        slug: review.product.slug,
        status: review.product.status,
        category: {
          id: review.product.category.id as string & tags.Format<"uuid">,
          name: review.product.category.name,
          slug: review.product.category.slug,
          parent_id: review.product.category.parent_id,
          display_order: review.product.category.display_order,
          is_active: review.product.category.is_active,
          parent: review.product.category.parent
            ? ({
                id: review.product.category.parent.id as string &
                  tags.Format<"uuid">,
                name: review.product.category.parent.name,
                slug: review.product.category.parent.slug,
                parent_id: review.product.category.parent.parent_id,
                display_order: review.product.category.parent.display_order,
                is_active: review.product.category.parent.is_active,
              } satisfies IEcommerceMallCategory.ISummary)
            : undefined,
        } satisfies IEcommerceMallCategory.ISummary,
        deleted_at: review.product.deleted_at?.toISOString() ?? null,
      } satisfies IEcommerceMallProduct.ISummary,
      rating: review.rating as number &
        tags.Type<"int32"> &
        tags.Minimum<1> &
        tags.Maximum<5>,
      title: review.title,
      is_verified_purchase: review.is_verified_purchase,
      helpfulness_vote_count: helpfulnessVoteCount as number &
        tags.Type<"int32">,
      created_at: review.created_at.toISOString(),
      updated_at: review.updated_at.toISOString(),
      deleted_at: review.deleted_at?.toISOString() ?? null,
    } satisfies IEcommerceMallReview.ISummary;
  });
  // Generate cursor for next page navigation
  const nextCursor =
    data.length > 0
      ? `${data[data.length - 1].created_at}|${data[data.length - 1].id}`
      : undefined;
  return {
    pagination: {
      current: page as number & tags.Type<"int32"> & tags.Minimum<0>,
      limit: limit as number & tags.Type<"int32"> & tags.Minimum<0>,
      records: total as number & tags.Type<"int32"> & tags.Minimum<0>,
      pages: Math.ceil(total / limit) as number &
        tags.Type<"int32"> &
        tags.Minimum<0>,
    } satisfies IPage.IPagination,
    data: data,
  } satisfies IPageIEcommerceMallReview.ISummary;
}
