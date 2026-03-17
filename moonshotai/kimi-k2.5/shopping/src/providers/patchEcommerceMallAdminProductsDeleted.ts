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
import { AdminPayload } from "../decorators/payload/AdminPayload";
import { EcommerceMallProductAtSummaryTransformer } from "../transformers/EcommerceMallProductAtSummaryTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchEcommerceMallAdminProductsDeleted(props: {
  admin: AdminPayload;
  body: IEcommerceMallProduct.IRequest;
}): Promise<IPageIEcommerceMallProduct.ISummary> {
  const page = props.body.page ?? 1;
  const limit = props.body.limit ?? 20;
  const skip = (page - 1) * limit;
  const where: Prisma.ecommerce_mall_productsWhereInput = {
    deleted_at: { not: null },
    ...(props.body.name && {
      name: { contains: props.body.name, mode: "insensitive" as const },
    }),
    ...(props.body.categoryId && {
      category_id: props.body.categoryId,
    }),
    ...(props.body.minPrice !== null &&
      props.body.minPrice !== undefined && {
        OR: [
          { base_price: { gte: props.body.minPrice } },
          {
            variants: {
              some: {
                deleted_at: null,
                price: { gte: props.body.minPrice },
              },
            },
          },
        ],
      }),
    ...(props.body.maxPrice !== null &&
      props.body.maxPrice !== undefined && {
        OR: [
          { base_price: { lte: props.body.maxPrice } },
          {
            variants: {
              some: {
                deleted_at: null,
                price: { lte: props.body.maxPrice },
              },
            },
          },
        ],
      }),
  };
  const orderBy: Prisma.ecommerce_mall_productsOrderByWithRelationInput =
    props.body.sort === "price_asc"
      ? { base_price: "asc" as const }
      : props.body.sort === "price_desc"
        ? { base_price: "desc" as const }
        : { created_at: "desc" as const };
  const products = await MyGlobal.prisma.ecommerce_mall_products.findMany({
    where,
    skip,
    take: limit,
    orderBy,
    ...EcommerceMallProductAtSummaryTransformer.select(),
  });
  const total = await MyGlobal.prisma.ecommerce_mall_products.count({ where });
  return {
    data: await ArrayUtil.asyncMap(
      products,
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
