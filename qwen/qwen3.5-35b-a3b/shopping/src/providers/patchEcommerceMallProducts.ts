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
import { EcommerceMallCategoryAtSummaryTransformer } from "../transformers/EcommerceMallCategoryAtSummaryTransformer";
import { EcommerceMallProductAtSummaryTransformer } from "../transformers/EcommerceMallProductAtSummaryTransformer";
import { EcommerceMallSellerAtSummaryTransformer } from "../transformers/EcommerceMallSellerAtSummaryTransformer";
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
    ...(props.body.category_id !== undefined && {
      category_id: props.body.category_id,
    }),
    ...(props.body.seller_id !== undefined && {
      seller_id: props.body.seller_id,
    }),
    ...(props.body.is_active !== undefined && {
      is_active: props.body.is_active,
    }),
    ...(props.body.name_search !== undefined && {
      name: { contains: props.body.name_search, mode: "insensitive" },
    }),
    ...(props.body.created_after !== undefined && {
      created_at: { gte: new Date(props.body.created_after) },
    }),
    ...(props.body.created_before !== undefined && {
      created_at: { lte: new Date(props.body.created_before) },
    }),
    ...(props.body.min_price !== undefined && {
      base_price: { gte: props.body.min_price },
    }),
    ...(props.body.max_price !== undefined && {
      base_price: { lte: props.body.max_price },
    }),
  };
  const orderByInput = (
    props.body.sort_by === "base_price"
      ? { base_price: props.body.sort_direction ?? ("desc" as const) }
      : props.body.sort_by === "name"
        ? { name: props.body.sort_direction ?? ("asc" as const) }
        : { created_at: props.body.sort_direction ?? ("desc" as const) }
  ) satisfies Prisma.ecommerce_mall_productsOrderByWithRelationInput;
  const data = await MyGlobal.prisma.ecommerce_mall_products.findMany({
    where: whereInput,
    skip,
    take: limit,
    orderBy: orderByInput,
    select: {
      id: true,
      name: true,
      base_price: true,
      category: EcommerceMallCategoryAtSummaryTransformer.select(),
      seller: EcommerceMallSellerAtSummaryTransformer.select(),
      is_active: true,
    },
  });
  const total = await MyGlobal.prisma.ecommerce_mall_products.count({
    where: whereInput,
  });
  return {
    data: await ArrayUtil.asyncMap(
      data,
      EcommerceMallProductAtSummaryTransformer.transform,
    ),
    pagination: {
      current: page,
      limit: limit,
      records: total,
      pages: Math.ceil(total / limit),
    } satisfies IPage.IPagination,
  };
}
