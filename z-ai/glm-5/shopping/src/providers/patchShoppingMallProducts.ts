import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageIShoppingMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallProduct";
import { IShoppingMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProduct";
import { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { ShoppingMallProductAtSummaryTransformer } from "../transformers/ShoppingMallProductAtSummaryTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchShoppingMallProducts(props: {
  body: IShoppingMallProduct.IRequest;
}): Promise<IPageIShoppingMallProduct.ISummary> {
  const page = props.body.page ?? 1;
  const limit = props.body.limit ?? 20;
  const skip = (page - 1) * limit;
  // Build WHERE conditions
  const whereInput = {
    deleted_at: null,
    ...(props.body.name && {
      name: { contains: props.body.name, mode: "insensitive" as const },
    }),
    ...(props.body.categoryId && {
      OR: [
        { category_id: props.body.categoryId },
        {
          category: {
            parent_id: props.body.categoryId,
          },
        },
      ],
    }),
    ...(props.body.priceMin !== undefined && {
      base_price: { gte: props.body.priceMin },
    }),
    ...(props.body.priceMax !== undefined && {
      base_price: { lte: props.body.priceMax },
    }),
    ...(props.body.inStock === true && {
      variants: {
        some: {
          deleted_at: null,
        },
      },
    }),
  } satisfies Prisma.shopping_mall_productsWhereInput;
  // Build ORDER BY
  const orderByInput = (
    props.body.sort === "price_asc"
      ? { base_price: "asc" as const }
      : props.body.sort === "price_desc"
        ? { base_price: "desc" as const }
        : { created_at: "desc" as const }
  ) satisfies Prisma.shopping_mall_productsOrderByWithRelationInput;
  // Execute queries
  const products = await MyGlobal.prisma.shopping_mall_products.findMany({
    where: whereInput,
    skip,
    take: limit,
    orderBy: orderByInput,
    ...ShoppingMallProductAtSummaryTransformer.select(),
  });
  const total = await MyGlobal.prisma.shopping_mall_products.count({
    where: whereInput,
  });
  // Transform response
  const data = await ArrayUtil.asyncMap(
    products,
    ShoppingMallProductAtSummaryTransformer.transform,
  );
  return {
    data,
    pagination: {
      current: page,
      limit,
      records: total,
      pages: Math.ceil(total / limit),
    } satisfies IPage.IPagination,
  } satisfies IPageIShoppingMallProduct.ISummary;
}
