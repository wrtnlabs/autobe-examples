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
  const limit = props.body.limit ?? props.body.page_size ?? 20;
  const skip = (page - 1) * limit;
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
  const orderByInput = (() => {
    const sortBy = props.body.sort_by ?? "created_at";
    const sortOrder = props.body.sort_order ?? "desc";
    switch (sortBy) {
      case "name":
        return { name: sortOrder };
      case "created_at":
        return { created_at: sortOrder };
      case "updated_at":
        return { updated_at: sortOrder };
      case "base_price":
        return { base_price: sortOrder };
      case "display_order":
        return { category: { display_order: sortOrder } };
      default:
        return { created_at: sortOrder };
    }
  })() satisfies Prisma.ecommerce_mall_productsOrderByWithRelationInput;
  const [data, total] = await Promise.all([
    MyGlobal.prisma.ecommerce_mall_products.findMany({
      where: whereInput,
      skip,
      take: limit,
      orderBy: orderByInput,
      ...EcommerceMallProductAtSummaryTransformer.select(),
    }),
    MyGlobal.prisma.ecommerce_mall_products.count({ where: whereInput }),
  ]);
  return {
    data: await ArrayUtil.asyncMap(
      data,
      EcommerceMallProductAtSummaryTransformer.transform,
    ),
    pagination: {
      current: page,
      limit,
      records: total,
      pages: Math.ceil(total / limit),
    } satisfies IPage.IPagination,
  };
}
