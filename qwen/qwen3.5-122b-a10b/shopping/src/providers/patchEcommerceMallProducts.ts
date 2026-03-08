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
import { EcommerceMallProductAtSummaryTransformer } from "../transformers/EcommerceMallProductAtSummaryTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchEcommerceMallProducts(props: {
  body: IEcommerceMallProduct.IRequest;
}): Promise<IPageIEcommerceMallProduct.ISummary> {
  const page = props.body.page ?? 1;
  const limit = Math.min(props.body.limit ?? 20, 100);
  const skip = (page - 1) * limit;
  const whereInput: Prisma.ecommerce_mall_productsWhereInput = {
    deleted_at: null,
    status: {
      not: "suspended",
    },
    ...(props.body.search && {
      OR: [
        {
          name: {
            contains: props.body.search,
            mode: "insensitive",
          },
        },
        {
          description: {
            contains: props.body.search,
            mode: "insensitive",
          },
        },
      ],
    }),
    ...(props.body.category_id && {
      category_id: props.body.category_id,
    }),
    ...(props.body.min_price !== undefined && {
      base_price: {
        gte: props.body.min_price,
      },
    }),
    ...(props.body.max_price !== undefined && {
      base_price: {
        lte: props.body.max_price,
      },
    }),
    ...(props.body.in_stock === true && {
      variants: {
        some: {
          stock_quantity: {
            gt: 0,
          },
          deleted_at: null,
        },
      },
    }),
  } satisfies Prisma.ecommerce_mall_productsWhereInput;
  const orderByInput: Prisma.ecommerce_mall_productsOrderByWithRelationInput =
    props.body.sort === "price_asc"
      ? { base_price: "asc" as const }
      : props.body.sort === "price_desc"
        ? { base_price: "desc" as const }
        : { created_at: "desc" as const };
  const [data, total] = await Promise.all([
    MyGlobal.prisma.ecommerce_mall_products.findMany({
      where: whereInput,
      orderBy: orderByInput,
      skip,
      take: limit,
      ...EcommerceMallProductAtSummaryTransformer.select(),
    }),
    MyGlobal.prisma.ecommerce_mall_products.count({
      where: whereInput,
    }),
  ]);
  return {
    data: await Promise.all(
      data.map((record) =>
        EcommerceMallProductAtSummaryTransformer.transform(record),
      ),
    ),
    pagination: {
      current: page,
      limit,
      records: total,
      pages: Math.ceil(total / limit),
    } satisfies IPage.IPagination,
  } satisfies IPageIEcommerceMallProduct.ISummary;
}
