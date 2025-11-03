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
import { AdminPayload } from "../decorators/payload/AdminPayload";

export async function patchShoppingAdminReviews(props: {
  admin: AdminPayload;
  body: IShoppingReview.IRequest;
}): Promise<IPageIShoppingReview.ISummary> {
  const {
    page,
    limit,
    sort_by,
    sort_order,
    query,
    review_state,
    star_rating,
    customer_id,
    sku_id,
    order_line_id,
    created_at_from,
    created_at_to,
    include_deleted,
    include_pending,
  } = props.body;

  // Pagination setup
  const safePage = page ?? 1;
  const safeLimit = limit ?? 20;
  const skip = (safePage - 1) * safeLimit;
  // Safe sort field
  const allowedSort: ("created_at" | "updated_at" | "rating" | "state")[] = [
    "created_at",
    "updated_at",
    "rating",
    "state",
  ];
  const sortField = allowedSort.includes(sort_by as any)
    ? sort_by
    : "created_at";
  const orderDirection = sort_order === "asc" ? "asc" : "desc";

  // Build where condition
  const where: any = {
    ...(include_deleted ? {} : { deleted_at: null }),
    ...(query ? { comment: { contains: query } } : {}),
    ...(review_state ? { state: review_state } : {}),
    ...(star_rating ? { rating: star_rating } : {}),
    ...(customer_id ? { shopping_customer_id: customer_id } : {}),
    ...(sku_id ? { shopping_sku_id: sku_id } : {}),
    ...(order_line_id ? { shopping_order_line_id: order_line_id } : {}),
    ...(created_at_from || created_at_to
      ? {
          created_at: {
            ...(created_at_from ? { gte: created_at_from } : {}),
            ...(created_at_to ? { lte: created_at_to } : {}),
          },
        }
      : {}),
    ...(include_pending ? {} : { state: { not: "pending_moderation" } }),
  };

  // Get total count for pagination
  const total = await MyGlobal.prisma.shopping_reviews.count({ where });

  // Fetch paginated reviews, order by sort
  const reviews = await MyGlobal.prisma.shopping_reviews.findMany({
    where,
    orderBy:
      sortField === "updated_at"
        ? { updated_at: orderDirection }
        : sortField === "rating"
          ? { rating: orderDirection }
          : sortField === "state"
            ? { state: orderDirection }
            : { created_at: orderDirection },
    skip,
    take: safeLimit,
  });

  // Fetch all needed customers and SKUs in one go (avoid N+1)
  const customerIds = Array.from(
    new Set(reviews.map((r) => r.shopping_customer_id)),
  );
  const skuIds = Array.from(new Set(reviews.map((r) => r.shopping_sku_id)));
  const customers = await MyGlobal.prisma.shopping_customers.findMany({
    where: { id: { in: customerIds } },
  });
  const skus = await MyGlobal.prisma.shopping_skus.findMany({
    where: { id: { in: skuIds } },
  });

  // Build id maps for fast lookup
  const customerMap = Object.fromEntries(customers.map((c) => [c.id, c]));
  const skuMap = Object.fromEntries(skus.map((s) => [s.id, s]));

  // Map results to DTO
  const data: IShoppingReview.ISummary[] = reviews.map((r) => {
    const customer = customerMap[r.shopping_customer_id];
    const sku = skuMap[r.shopping_sku_id];
    // Compose ISummary objects for customer and sku (no assertions)
    const customerSummary: IShoppingCustomer.ISummary = {
      id: customer.id,
      name: customer.name,
      email: customer.email,
      is_active: customer.is_active,
      created_at: toISOStringSafe(customer.created_at),
      deleted_at: customer.deleted_at
        ? toISOStringSafe(customer.deleted_at)
        : null,
    };
    const skuSummary: IShoppingSku.ISummary = {
      id: sku.id,
      sku_code: sku.sku_code,
      price: sku.price,
      is_active: sku.is_active,
      status: sku.status,
    };
    return {
      id: r.id,
      customer: customerSummary,
      sku: skuSummary,
      order_line_id: r.shopping_order_line_id,
      rating: r.rating,
      comment: r.comment,
      state: r.state,
      created_at: toISOStringSafe(r.created_at),
      updated_at: toISOStringSafe(r.updated_at),
    };
  });

  return {
    pagination: {
      current: Number(safePage),
      limit: Number(safeLimit),
      records: total,
      pages: Math.ceil(total / safeLimit),
    },
    data,
  };
}
