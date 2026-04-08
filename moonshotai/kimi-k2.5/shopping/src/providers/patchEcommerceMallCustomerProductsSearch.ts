import { IEcommerceMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCategory";
import { IEcommerceMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProduct";
import { IEcommerceMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSeller";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageIEcommerceMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEcommerceMallProduct";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { CustomerPayload } from "../decorators/payload/CustomerPayload";
import { EcommerceMallProductAtSummaryTransformer } from "../transformers/EcommerceMallProductAtSummaryTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchEcommerceMallCustomerProductsSearch(props: {
  customer: CustomerPayload;
  body: IEcommerceMallProduct.IRequest;
}): Promise<IPageIEcommerceMallProduct.ISummary> {
  const page = props.body.page ?? 1;
  const limit = props.body.limit ?? 20;
  const skip = (page - 1) * limit;
  const baseWhere: Prisma.ecommerce_mall_productsWhereInput = {
    deleted_at: null,
    ...(props.body.search && {
      name: {
        contains: props.body.search,
        mode: "insensitive",
      },
    }),
    ...(props.body.categoryId && {
      category_id: props.body.categoryId,
    }),
    ...(props.body.subcategoryId && {
      category_id: props.body.subcategoryId,
    }),
  };
  const priceWhere: Prisma.ecommerce_mall_productsWhereInput =
    props.body.minPrice !== null || props.body.maxPrice !== null
      ? {
          base_price: {
            ...(props.body.minPrice !== null && { gte: props.body.minPrice }),
            ...(props.body.maxPrice !== null && { lte: props.body.maxPrice }),
          },
        }
      : {};
  const where: Prisma.ecommerce_mall_productsWhereInput = {
    ...baseWhere,
    ...priceWhere,
    ...(props.body.inStockOnly && {
      variants: {
        some: {
          inventoryRecords: {
            some: {
              quantity_change: { gt: 0 },
            },
          },
        },
      },
    }),
  };
  const orderBy: Prisma.ecommerce_mall_productsOrderByWithRelationInput =
    props.body.sortBy === "priceAsc"
      ? { base_price: "asc" }
      : props.body.sortBy === "priceDesc"
        ? { base_price: "desc" }
        : { created_at: "desc" };
  const products = await MyGlobal.prisma.ecommerce_mall_products.findMany({
    where,
    skip,
    take: limit,
    orderBy,
    ...EcommerceMallProductAtSummaryTransformer.select(),
  });
  const total = await MyGlobal.prisma.ecommerce_mall_products.count({
    where,
  });
  const data = await ArrayUtil.asyncMap(
    products,
    EcommerceMallProductAtSummaryTransformer.transform,
  );
  return {
    data,
    pagination: {
      current: page,
      limit: limit,
      records: total,
      pages: Math.ceil(total / limit),
    } satisfies IPage.IPagination,
  };
}
