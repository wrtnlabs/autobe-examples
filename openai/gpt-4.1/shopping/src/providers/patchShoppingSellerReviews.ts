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
import { SellerPayload } from "../decorators/payload/SellerPayload";

export async function patchShoppingSellerReviews(props: {
  seller: SellerPayload;
  body: IShoppingReview.IRequest;
}): Promise<IPageIShoppingReview.ISummary> {
  const { seller, body } = props;

  // Pagination
  const page = typeof body.page === "number" ? body.page : 1;
  const limit = typeof body.limit === "number" ? body.limit : 20;
  const offset = (page - 1) * limit;

  // sort fields
  const allowedSort: ("created_at" | "updated_at" | "rating" | "state")[] = [
    "created_at",
    "updated_at",
    "rating",
    "state",
  ];
  const sortField = allowedSort.includes(body.sort_by as any)
    ? (body.sort_by as "created_at" | "updated_at" | "rating" | "state")
    : "created_at";
  const sortOrder = body.sort_order === "asc" ? "asc" : "desc";

  // Get all SKUs owned by this seller: shopping_skus have relation to product
  // via shopping_product_id -> shopping_products.shopping_seller_id
  const skuRecords = await MyGlobal.prisma.shopping_skus.findMany({
    where: {
      product: { shopping_seller_id: seller.id },
    },
    select: { id: true },
  });
  const skuIdList = skuRecords.map((sku) => sku.id);
  if (skuIdList.length === 0) {
    return {
      pagination: {
        current: Number(page),
        limit: Number(limit),
        records: 0,
        pages: 0,
      },
      data: [],
    };
  }

  const where: Record<string, any> = {
    ...(body.include_deleted !== true && { deleted_at: null }),
    ...(body.review_state !== undefined &&
      body.review_state !== null && { state: body.review_state }),
    ...(body.star_rating !== undefined ? { rating: body.star_rating } : {}),
    ...(body.customer_id ? { shopping_customer_id: body.customer_id } : {}),
    ...(body.sku_id ? { shopping_sku_id: body.sku_id } : {}),
    ...(body.order_line_id
      ? { shopping_order_line_id: body.order_line_id }
      : {}),
    ...(body.created_at_from
      ? { created_at: { gte: body.created_at_from } }
      : {}),
    ...(body.created_at_to
      ? {
          created_at: {
            ...(body.created_at_from ? { gte: body.created_at_from } : {}),
            lte: body.created_at_to,
          },
        }
      : {}),
    shopping_sku_id: { in: skuIdList },
  };

  if (body.query) {
    where.comment = { contains: body.query };
  }

  const total = await MyGlobal.prisma.shopping_reviews.count({ where });
  const reviews = await MyGlobal.prisma.shopping_reviews.findMany({
    where,
    orderBy: { [sortField]: sortOrder },
    skip: offset,
    take: limit,
  });

  // Batch fetch referenced customers/skus for mapping
  const customerIds = Array.from(
    new Set(reviews.map((r) => r.shopping_customer_id)),
  );
  const skuIds = Array.from(new Set(reviews.map((r) => r.shopping_sku_id)));
  const [customerList, skuList] = await Promise.all([
    MyGlobal.prisma.shopping_customers.findMany({
      where: { id: { in: customerIds } },
    }),
    MyGlobal.prisma.shopping_skus.findMany({ where: { id: { in: skuIds } } }),
  ]);
  const customerMap = Object.fromEntries(customerList.map((c) => [c.id, c]));
  const skuMap = Object.fromEntries(skuList.map((s) => [s.id, s]));

  const data: IShoppingReview.ISummary[] = reviews.map((rev) => {
    const cust = customerMap[rev.shopping_customer_id];
    const sku = skuMap[rev.shopping_sku_id];
    return {
      id: rev.id,
      customer: {
        id: cust.id,
        name: cust.name,
        email: cust.email,
        is_active: cust.is_active,
        created_at: toISOStringSafe(cust.created_at),
        deleted_at: cust.deleted_at ? toISOStringSafe(cust.deleted_at) : null,
      },
      sku: {
        id: sku.id,
        sku_code: sku.sku_code,
        price: sku.price,
        is_active: sku.is_active,
        status: sku.status,
      },
      order_line_id: rev.shopping_order_line_id,
      rating: rev.rating,
      comment: rev.comment,
      state: rev.state,
      created_at: toISOStringSafe(rev.created_at),
      updated_at: toISOStringSafe(rev.updated_at),
    };
  });
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
