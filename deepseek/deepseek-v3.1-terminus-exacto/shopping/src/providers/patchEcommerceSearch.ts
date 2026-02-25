import { IEcommerceCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceCategory";
import { IEcommerceProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceProduct";
import { IEcommerceSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceSeller";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageIEcommerceProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEcommerceProduct";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { EcommerceProductAtSummaryTransformer } from "../transformers/EcommerceProductAtSummaryTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchEcommerceSearch(props: {
  body: IEcommerceProduct.IRequest;
}): Promise<IPageIEcommerceProduct.ISummary> {
  const page = props.body.page ?? 1;
  const limit = props.body.limit ?? 100;
  const skip = (page - 1) * limit;
  // Build WHERE conditions
  const whereInput = {
    deleted_at: null,
    seller: {
      deleted_at: null,
      account_status: "active", // Only products from active sellers
    },
    ...(props.body.search && {
      OR: [
        { name: { contains: props.body.search, mode: "insensitive" } },
        { description: { contains: props.body.search, mode: "insensitive" } },
      ],
    }),
    ...(props.body.category_id && {
      ecommerce_category_id: props.body.category_id,
    }),
    ...(props.body.price_min !== undefined || props.body.price_max !== undefined
      ? {
          base_price: {
            ...(props.body.price_min !== undefined && {
              gte: props.body.price_min ?? 0,
            }),
            ...(props.body.price_max !== undefined && {
              lte: props.body.price_max ?? Number.MAX_SAFE_INTEGER,
            }),
          },
        }
      : {}),
    ...(props.body.in_stock === true
      ? {
          variants: {
            some: {
              quantity: { gt: 0 }, // Changed from stock_quantity to quantity based on schema
            },
          },
        }
      : {}),
  } satisfies Prisma.ecommerce_productsWhereInput;
  // Determine ORDER BY
  const orderByInput = (
    props.body.sort_by === "price_low"
      ? { base_price: "asc" as const }
      : props.body.sort_by === "price_high"
        ? { base_price: "desc" as const }
        : props.body.sort_by === "relevance"
          ? {
              name: "asc" as const,
            }
          : { created_at: "desc" as const }
  ) satisfies Prisma.ecommerce_productsOrderByWithRelationInput;
  // Execute queries
  const data = await MyGlobal.prisma.ecommerce_products.findMany({
    where: whereInput,
    skip,
    take: limit,
    orderBy: orderByInput,
    ...EcommerceProductAtSummaryTransformer.select(),
  });
  const total = await MyGlobal.prisma.ecommerce_products.count({
    where: whereInput,
  });
  return {
    data: await ArrayUtil.asyncMap(
      data satisfies any as any,
      EcommerceProductAtSummaryTransformer.transform,
    ),
    pagination: {
      current: page,
      limit: limit,
      records: total,
      pages: Math.ceil(total / limit),
    } satisfies IPage.IPagination,
  };
}
