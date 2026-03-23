import { IEcommerceMallProductPerformance } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductPerformance";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageIEcommerceMallProductPerformance } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEcommerceMallProductPerformance";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { SellerPayload } from "../decorators/payload/SellerPayload";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchEcommerceMallSellerAnalyticsProductPerformance(props: {
  seller: SellerPayload;
  body: IEcommerceMallProductPerformance.IRequest;
}): Promise<IPageIEcommerceMallProductPerformance.ISummary> {
  const page = props.body.page ?? 1;
  const limit = props.body.limit ?? 20;
  const skip = (page - 1) * limit;
  // Build WHERE clause for product filtering
  const where: Prisma.ecommerce_mall_productsWhereInput = {
    seller_id: props.seller.id,
    deleted_at: null,
    ...(props.body.category_id && { category_id: props.body.category_id }),
    ...(props.body.created_from && {
      created_at: { gte: new Date(props.body.created_from) },
    }),
    ...(props.body.created_to && {
      created_at: { lt: new Date(props.body.created_to) },
    }),
    ...(props.body.updated_from && {
      updated_at: { gte: new Date(props.body.updated_from) },
    }),
    ...(props.body.updated_to && {
      updated_at: { lt: new Date(props.body.updated_to) },
    }),
    ...(props.body.search && { name: { contains: props.body.search } }),
  };
  // Calculate total count for pagination
  const total = await MyGlobal.prisma.ecommerce_mall_products.count({ where });
  // Fetch paginated products with aggregations
  const products = await MyGlobal.prisma.ecommerce_mall_products.findMany({
    where,
    skip,
    take: limit,
    orderBy: props.body.search ? { name: "asc" } : { created_at: "desc" },
    select: {
      id: true,
      name: true,
      base_price: true,
      is_available: true,
      created_at: true,
    },
  });
  // Transform products to performance summaries
  const data = products.map((product) => {
    // Calculate metrics (dummy values since we don't have related data)
    const total_quantity_sold = 0 as number & tags.Type<"int32">;
    const total_revenue = 0;
    const average_rating = 0;
    const review_count = 0 as number & tags.Type<"int32">;
    const wishlist_count = 0 as number & tags.Type<"int32">;
    const cart_count = 0 as number & tags.Type<"int32">;
    return {
      id: product.id as string & tags.Format<"uuid">,
      name: product.name,
      base_price: product.base_price,
      is_available: product.is_available,
      total_quantity_sold,
      total_revenue,
      average_rating,
      review_count,
      view_count: 0 as number & tags.Type<"int32">,
      wishlist_count,
      cart_count,
      created_at: toISOStringSafe(product.created_at),
    } satisfies IEcommerceMallProductPerformance.ISummary;
  });
  const pages = Math.ceil(total / limit);
  return {
    data,
    pagination: {
      current: page,
      limit,
      records: total,
      pages: pages === 0 ? 1 : pages,
    } satisfies IPage.IPagination,
  } satisfies IPageIEcommerceMallProductPerformance.ISummary;
}
