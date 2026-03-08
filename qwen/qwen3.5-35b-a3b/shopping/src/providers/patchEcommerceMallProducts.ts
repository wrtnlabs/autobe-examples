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
  const pageSize = props.body.page_size ?? 20;
  const limit = props.body.limit ?? 100;
  const effectiveLimit = Math.min(pageSize, limit);
  const skip = (page - 1) * effectiveLimit;
  const whereInput: Prisma.ecommerce_mall_productsWhereInput = {
    deleted_at: null,
    is_active: true,
    ...(props.body.search && {
      OR: [
        { name: { contains: props.body.search, mode: "insensitive" } },
        { description: { contains: props.body.search, mode: "insensitive" } },
      ],
    }),
    ...(props.body.category_id && { category_id: props.body.category_id }),
    ...(props.body.seller_id && { seller_id: props.body.seller_id }),
    ...(props.body.min_price !== undefined && {
      base_price: { gte: props.body.min_price },
    }),
    ...(props.body.max_price !== undefined && {
      base_price: { lte: props.body.max_price },
    }),
  };
  const sortBy = props.body.sort_by ?? "created_at";
  const sortOrder = props.body.sort_order ?? "desc";
  const orderByInput = {
    [sortBy]: sortOrder,
  } satisfies Prisma.ecommerce_mall_productsOrderByWithRelationInput;
  const [data, total] = await Promise.all([
    MyGlobal.prisma.ecommerce_mall_products.findMany({
      where: whereInput,
      skip,
      take: effectiveLimit,
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
      limit: effectiveLimit,
      records: total,
      pages: Math.ceil(total / effectiveLimit),
    } satisfies IPage.IPagination,
  };
}
