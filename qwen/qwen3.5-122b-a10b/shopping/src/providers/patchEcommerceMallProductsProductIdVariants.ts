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
import { EcommerceMallProductVariantAtSummaryTransformer } from "../transformers/EcommerceMallProductVariantAtSummaryTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchEcommerceMallProductsProductIdVariants(props: {
  productId: string & tags.Format<"uuid">;
  body: IEcommerceMallProductVariant.IRequest;
}): Promise<IPageIEcommerceMallProductVariant.ISummary> {
  // Verify product exists
  const product =
    await MyGlobal.prisma.ecommerce_mall_products.findUniqueOrThrow({
      where: { id: props.productId },
      select: { status: true },
    });
  // Check product status - only active products are visible to non-admin users
  if (product.status !== "active") {
    throw new HttpException("Product not found", 404);
  }
  // Build where clause with filters
  const page = props.body.page ?? 1;
  const limit = props.body.limit ?? 20;
  const skip = (page - 1) * limit;
  const whereInput: Prisma.ecommerce_mall_product_variantsWhereInput = {
    ecommerce_mall_product_id: props.productId,
    deleted_at: null,
    ...(props.body.sku_code && {
      sku_code: {
        contains: props.body.sku_code,
      },
    }),
    ...(props.body.price_min !== undefined && {
      price: {
        gte: props.body.price_min,
      },
    }),
    ...(props.body.price_max !== undefined && {
      price: {
        lte: props.body.price_max,
      },
    }),
    ...(props.body.stock_quantity !== undefined && {
      stock_quantity: {
        gte: props.body.stock_quantity,
      },
    }),
  } satisfies Prisma.ecommerce_mall_product_variantsWhereInput;
  // Build orderBy clause
  const sort_by = props.body.sort_by ?? "created_at";
  const sort_order =
    props.body.sort_order ?? (sort_by === "created_at" ? "desc" : "asc");
  const orderByInput: Prisma.ecommerce_mall_product_variantsOrderByWithRelationInput =
    {
      [sort_by]: sort_order,
    } satisfies Prisma.ecommerce_mall_product_variantsOrderByWithRelationInput;
  // Execute queries sequentially
  const [data, total] = await Promise.all([
    MyGlobal.prisma.ecommerce_mall_product_variants.findMany({
      where: whereInput,
      orderBy: orderByInput,
      skip,
      take: limit,
      ...EcommerceMallProductVariantAtSummaryTransformer.select(),
    }),
    MyGlobal.prisma.ecommerce_mall_product_variants.count({
      where: whereInput,
    }),
  ]);
  // Transform results
  const transformed = await Promise.all(
    data.map((variant) =>
      EcommerceMallProductVariantAtSummaryTransformer.transform(variant),
    ),
  );
  // Calculate pagination
  const pages = Math.ceil(total / limit);
  return {
    data: transformed,
    pagination: {
      current: page,
      limit: limit,
      records: total,
      pages: pages,
    } satisfies IPage.IPagination,
  } satisfies IPageIEcommerceMallProductVariant.ISummary;
}
