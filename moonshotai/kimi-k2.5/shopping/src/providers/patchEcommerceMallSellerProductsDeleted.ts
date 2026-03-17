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
import { SellerPayload } from "../decorators/payload/SellerPayload";
import { EcommerceMallProductAtSummaryTransformer } from "../transformers/EcommerceMallProductAtSummaryTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchEcommerceMallSellerProductsDeleted(props: {
  seller: SellerPayload;
  body: IEcommerceMallProduct.IRequest;
}): Promise<IPageIEcommerceMallProduct.ISummary> {
  const page = props.body.page ?? 1;
  const limit = props.body.limit ?? 20;
  const skip = (page - 1) * limit;
  // Base where: deleted products belonging to this seller
  const where: Prisma.ecommerce_mall_productsWhereInput = {
    deleted_at: { not: null },
    seller_id: props.seller.id,
  };
  // Name filter (partial match, case-insensitive)
  if (props.body.name) {
    where.name = { contains: props.body.name, mode: "insensitive" };
  }
  // Category filter
  if (props.body.categoryId) {
    where.category_id = props.body.categoryId;
  }
  // Price filters - check base_price against min/max
  if (props.body.minPrice !== undefined && props.body.minPrice !== null) {
    where.base_price = {
      ...(where.base_price as object),
      gte: props.body.minPrice,
    };
  }
  if (props.body.maxPrice !== undefined && props.body.maxPrice !== null) {
    where.base_price = {
      ...(where.base_price as object),
      lte: props.body.maxPrice,
    };
  }
  // Sort order
  const orderBy: Prisma.ecommerce_mall_productsOrderByWithRelationInput =
    props.body.sort === "price_asc"
      ? { base_price: "asc" }
      : props.body.sort === "price_desc"
        ? { base_price: "desc" }
        : { created_at: "desc" }; // 'newest' default
  // Execute query in parallel
  const [products, total] = await Promise.all([
    MyGlobal.prisma.ecommerce_mall_products.findMany({
      where,
      skip,
      take: limit,
      orderBy,
      ...EcommerceMallProductAtSummaryTransformer.select(),
    }),
    MyGlobal.prisma.ecommerce_mall_products.count({ where }),
  ]);
  // Transform results
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
