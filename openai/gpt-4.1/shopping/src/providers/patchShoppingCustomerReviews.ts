import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IShoppingReview } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingReview";
import { IPageIShoppingReview } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingReview";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IShoppingCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingCustomer";
import { IShoppingSku } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingSku";
import { CustomerPayload } from "../decorators/payload/CustomerPayload";

export async function patchShoppingCustomerReviews(props: {
  customer: CustomerPayload;
  body: IShoppingReview.IRequest;
}): Promise<IPageIShoppingReview.ISummary> {
  const { customer, body } = props;

  // Pagination
  const page = body.page;
  const limit = body.limit <= 100 ? body.limit : 100;
  const skip = (page - 1) * limit;

  // Build created_at range if present
  let createdAtFilter: { gte?: string; lte?: string } | undefined = undefined;
  if (body.created_at_from !== undefined && body.created_at_from !== null) {
    createdAtFilter = { ...(createdAtFilter ?? {}), gte: body.created_at_from };
  }
  if (body.created_at_to !== undefined && body.created_at_to !== null) {
    createdAtFilter = { ...(createdAtFilter ?? {}), lte: body.created_at_to };
  }

  // Build where clause
  const where = {
    shopping_customer_id: customer.id,
    deleted_at: null,
    ...(body.review_state !== undefined && { state: body.review_state }),
    ...(body.star_rating !== undefined && { rating: body.star_rating }),
    ...(body.sku_id !== undefined && { shopping_sku_id: body.sku_id }),
    ...(body.order_line_id !== undefined && {
      shopping_order_line_id: body.order_line_id,
    }),
    ...(createdAtFilter !== undefined && { created_at: createdAtFilter }),
    ...(body.query !== undefined && { comment: { contains: body.query } }),
  };

  // Sorting - use type assertion to literal 'asc' | 'desc'
  const orderBy =
    body.sort_by !== undefined
      ? [
          {
            [body.sort_by]: (body.sort_order === "asc" ? "asc" : "desc") as
              | "asc"
              | "desc",
          },
        ]
      : [{ created_at: "desc" as "desc" }];

  // Fetch total count for pagination
  const total = await MyGlobal.prisma.shopping_reviews.count({ where });

  // Fetch paginated reviews (with customer and sku relations)
  const rows = await MyGlobal.prisma.shopping_reviews.findMany({
    where,
    orderBy,
    skip,
    take: limit,
    include: {
      customer: true,
      sku: true,
    },
  });

  // Map results to IShoppingReview.ISummary[]
  const data = rows.map((review: any) => ({
    id: review.id,
    customer: {
      id: review.customer.id,
      name: review.customer.name,
      email: review.customer.email,
      is_active: review.customer.is_active,
      created_at: toISOStringSafe(review.customer.created_at),
      deleted_at:
        review.customer.deleted_at !== null &&
        review.customer.deleted_at !== undefined
          ? toISOStringSafe(review.customer.deleted_at)
          : null,
    },
    sku: {
      id: review.sku.id,
      sku_code: review.sku.sku_code,
      price: review.sku.price,
      is_active: review.sku.is_active,
      status: review.sku.status,
    },
    order_line_id: review.shopping_order_line_id,
    rating: review.rating,
    comment: review.comment,
    state: review.state,
    created_at: toISOStringSafe(review.created_at),
    updated_at: toISOStringSafe(review.updated_at),
  }));

  // Final paginated response
  return {
    pagination: {
      current: Number(page),
      limit: Number(limit),
      records: total,
      pages: Math.ceil(total / limit),
    },
    data,
  };
}
