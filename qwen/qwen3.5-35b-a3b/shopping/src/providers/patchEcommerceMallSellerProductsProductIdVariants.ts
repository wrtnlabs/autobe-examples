import { IEcommerceMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCategory";
import { IEcommerceMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProduct";
import { IEcommerceMallProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductVariant";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageIEcommerceMallProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEcommerceMallProductVariant";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { SellerPayload } from "../decorators/payload/SellerPayload";
import { EcommerceMallProductVariantAtSummaryTransformer } from "../transformers/EcommerceMallProductVariantAtSummaryTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchEcommerceMallSellerProductsProductIdVariants(props: {
  seller: SellerPayload;
  productId: string & tags.Format<"uuid">;
  body: IEcommerceMallProductVariant.IRequest;
}): Promise<IPageIEcommerceMallProductVariant.ISummary> {
  const page = props.body.page ?? 1;
  const limit = props.body.limit ?? 100;
  const skip = (page - 1) * limit;
  // Verify seller owns the product
  await MyGlobal.prisma.ecommerce_mall_products.findFirstOrThrow({
    where: {
      id: props.productId,
      seller_id: props.seller.id,
      deleted_at: null,
    },
  });
  // Build dynamic where clause from request filters
  const whereClause: Prisma.ecommerce_mall_product_variantsWhereInput = {
    product_id: props.productId,
    deleted_at: null,
    ...(props.body.stockQuantityMin !== undefined
      ? { stock_quantity: { gte: props.body.stockQuantityMin } }
      : {}),
    ...(props.body.stockQuantityMax !== undefined
      ? { stock_quantity: { lte: props.body.stockQuantityMax } }
      : {}),
    ...(props.body.basePriceMin !== undefined
      ? { base_price: { gte: props.body.basePriceMin } }
      : {}),
    ...(props.body.basePriceMax !== undefined
      ? { base_price: { lte: props.body.basePriceMax } }
      : {}),
    ...(props.body.status !== undefined ? { status: props.body.status } : {}),
    ...(props.body.isDefault !== undefined
      ? { is_default: props.body.isDefault }
      : {}),
    ...(props.body.sku !== undefined
      ? { sku: { contains: props.body.sku } }
      : {}),
    ...(props.body.search !== undefined
      ? { sku: { contains: props.body.search } }
      : {}),
  };
  // Build orderBy clause
  const orderByClause: Prisma.ecommerce_mall_product_variantsOrderByWithRelationInput[] =
    props.body.sort === "price_asc"
      ? [{ base_price: "asc" }, { sort_order: "asc" }]
      : props.body.sort === "price_desc"
        ? [{ base_price: "desc" }, { sort_order: "asc" }]
        : props.body.sort === "created_asc"
          ? [{ created_at: "asc" }, { sort_order: "asc" }]
          : props.body.sort === "created_desc"
            ? [{ created_at: "desc" }, { sort_order: "asc" }]
            : [{ sort_order: "asc" }, { created_at: "desc" }];
  const [data, total] = await Promise.all([
    MyGlobal.prisma.ecommerce_mall_product_variants.findMany({
      where: whereClause,
      skip,
      take: limit,
      orderBy: orderByClause,
      ...EcommerceMallProductVariantAtSummaryTransformer.select(),
    }),
    MyGlobal.prisma.ecommerce_mall_product_variants.count({
      where: whereClause,
    }),
  ]);
  const transformedData = await ArrayUtil.asyncMap(
    data,
    EcommerceMallProductVariantAtSummaryTransformer.transform,
  );
  return {
    data: transformedData,
    pagination: {
      current: page,
      limit: limit,
      records: total,
      pages: Math.ceil(total / limit),
    } satisfies IPage.IPagination,
  };
}
