import { IEcommerceMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCategory";
import { IEcommerceMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProduct";
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
import { EcommerceMallProductAtSummaryTransformer } from "../transformers/EcommerceMallProductAtSummaryTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchEcommerceMallProducts(props: {
  body: IEcommerceMallProduct.IRequest;
}): Promise<IPageIEcommerceMallProduct.ISummary> {
  const page = props.body.page ?? 1;
  const pageSize = props.body.page_size ?? 20;
  const limit = props.body.limit ?? 100;
  const effectiveLimit = limit !== null && limit < pageSize ? pageSize : limit;
  const actualLimit = effectiveLimit > 100 ? 100 : effectiveLimit;
  const skip = (page - 1) * actualLimit;
  const whereInput: Prisma.ecommerce_mall_productsWhereInput = {
    deleted_at: null,
    ...(props.body.category_id !== undefined && {
      category_id: props.body.category_id,
    }),
    ...(props.body.status !== undefined && {
      status: props.body.status,
    }),
    ...(props.body.seller_id !== undefined && {
      seller_id: props.body.seller_id,
    }),
    ...(props.body.name !== undefined && {
      name: {
        contains: props.body.name,
        mode: "insensitive" as const,
      },
    }),
    ...(props.body.base_price_min !== undefined && {
      base_price: {
        gte: props.body.base_price_min,
      },
    }),
    ...(props.body.base_price_max !== undefined && {
      base_price: {
        lte: props.body.base_price_max,
      },
    }),
  } satisfies Prisma.ecommerce_mall_productsWhereInput;
  const orderByInput:
    | Prisma.ecommerce_mall_productsOrderByWithRelationInput[]
    | undefined =
    props.body.sort_by !== undefined
      ? [
          {
            [props.body.sort_by]:
              props.body.sort_order === "asc" ? "asc" : "desc",
          },
        ]
      : undefined;
  const [data, total] = await Promise.all([
    MyGlobal.prisma.ecommerce_mall_products.findMany({
      where: whereInput,
      orderBy: orderByInput,
      skip,
      take: actualLimit,
      ...EcommerceMallProductAtSummaryTransformer.select(),
    }),
    MyGlobal.prisma.ecommerce_mall_products.count({ where: whereInput }),
  ]);
  const transformedData = await ArrayUtil.asyncMap(
    data,
    EcommerceMallProductAtSummaryTransformer.transform,
  );
  const pages = Math.ceil(total / actualLimit);
  return {
    pagination: {
      current: page,
      limit: actualLimit,
      records: total,
      pages,
    } satisfies IPage.IPagination,
    data: transformedData,
  } satisfies IPageIEcommerceMallProduct.ISummary;
}
