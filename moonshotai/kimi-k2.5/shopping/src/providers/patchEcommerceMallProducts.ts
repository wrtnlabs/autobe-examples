import { IEcommerceMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCategory";
import { IEcommerceMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProduct";
import { IEcommerceMallProductImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductImage";
import { IEcommerceMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSeller";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageIEcommerceMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEcommerceMallProduct";
import { IParentReference } from "@ORGANIZATION/PROJECT-api/lib/structures/IParentReference";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { EcommerceMallProductAtSummaryTransformer } from "../transformers/EcommerceMallProductAtSummaryTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchEcommerceMallProducts(props: {
  body: IEcommerceMallProduct.IRequest;
}): Promise<IPageIEcommerceMallProduct.ISummary> {
  const page = props.body.page ?? 1;
  const limit = props.body.limit ?? 20;
  const skip = (page - 1) * limit;
  const whereInput: Prisma.ecommerce_mall_productsWhereInput = {
    deleted_at: null,
    ...(props.body.name && {
      name: { contains: props.body.name, mode: "insensitive" },
    }),
    ...(props.body.categoryId && { category_id: props.body.categoryId }),
    ...(props.body.minPrice !== undefined &&
      props.body.minPrice !== null && {
        base_price: { gte: props.body.minPrice },
      }),
    ...(props.body.maxPrice !== undefined &&
      props.body.maxPrice !== null && {
        base_price: { lte: props.body.maxPrice },
      }),
    ...(props.body.inStockOnly && {
      variants: {
        some: {
          deleted_at: null,
          inventoryRecords: {
            some: {},
          },
        },
      },
    }),
  };
  const sort = props.body.sort ?? "newest";
  const orderByInput: Prisma.ecommerce_mall_productsOrderByWithRelationInput =
    sort === "price_asc"
      ? { base_price: "asc" }
      : sort === "price_desc"
        ? { base_price: "desc" }
        : { created_at: "desc" };
  const products = await MyGlobal.prisma.ecommerce_mall_products.findMany({
    where: whereInput,
    skip,
    take: limit,
    orderBy: orderByInput,
    ...EcommerceMallProductAtSummaryTransformer.select(),
  });
  const total = await MyGlobal.prisma.ecommerce_mall_products.count({
    where: whereInput,
  });
  const data = await ArrayUtil.asyncMap(
    products,
    EcommerceMallProductAtSummaryTransformer.transform,
  );
  return {
    data,
    pagination: {
      current: page,
      limit,
      records: total,
      pages: Math.ceil(total / limit),
    } satisfies IPage.IPagination,
  };
}
