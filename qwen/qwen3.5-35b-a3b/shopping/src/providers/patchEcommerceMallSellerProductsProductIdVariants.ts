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
import { EcommerceMallProductAtSummaryTransformer } from "../transformers/EcommerceMallProductAtSummaryTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchEcommerceMallSellerProductsProductIdVariants(props: {
  seller: SellerPayload;
  productId: string & tags.Format<"uuid">;
  body: IEcommerceMallProductVariant.IRequest;
}): Promise<IPageIEcommerceMallProductVariant.ISummary> {
  // Verify the seller owns this product
  const product =
    await MyGlobal.prisma.ecommerce_mall_products.findUniqueOrThrow({
      where: {
        id: props.productId,
        deleted_at: null,
      },
      select: {
        id: true,
        seller_id: true,
      },
    });
  if (product.seller_id !== props.seller.id) {
    throw new HttpException("Forbidden", 403);
  }
  // Build where clause from filters
  const whereInput: Prisma.ecommerce_mall_product_variantsWhereInput = {
    product_id: props.productId,
    deleted_at: null,
    ...(props.body.status !== undefined && { status: props.body.status }),
    ...(props.body.stockQuantityMin !== undefined && {
      stock_quantity: { gte: props.body.stockQuantityMin },
    }),
    ...(props.body.stockQuantityMax !== undefined && {
      stock_quantity: { lte: props.body.stockQuantityMax },
    }),
    ...(props.body.basePriceMin !== undefined && {
      base_price: { gte: props.body.basePriceMin },
    }),
    ...(props.body.basePriceMax !== undefined && {
      base_price: { lte: props.body.basePriceMax },
    }),
    ...(props.body.sku !== undefined && {
      sku: {
        contains: props.body.sku,
      },
    }),
    ...(props.body.isDefault !== undefined && {
      is_default: props.body.isDefault,
    }),
  };
  // Calculate pagination
  const page = props.body.page ?? 1;
  const limit = props.body.limit ?? 100;
  const skip = (page - 1) * limit;
  // Build orderBy clause
  const orderByInput: Prisma.ecommerce_mall_product_variantsOrderByWithRelationInput[] =
    props.body.sort === "sort_order"
      ? [{ sort_order: "asc" as const }, { created_at: "desc" as const }]
      : props.body.sort === "created_at"
        ? [{ created_at: "desc" as const }]
        : props.body.sort === "updated_at"
          ? [{ updated_at: "desc" as const }]
          : props.body.sort === "sku"
            ? [{ sku: "asc" as const }]
            : props.body.sort === "base_price"
              ? [{ base_price: "asc" as const }]
              : [
                  { sort_order: "asc" as const },
                  { created_at: "desc" as const },
                ];
  // Query variants with product relation using transformer select
  const data = await MyGlobal.prisma.ecommerce_mall_product_variants.findMany({
    where: whereInput,
    skip,
    take: limit,
    orderBy: orderByInput,
    include: {
      product: EcommerceMallProductAtSummaryTransformer.select(),
    },
  });
  // Query total count
  const total = await MyGlobal.prisma.ecommerce_mall_product_variants.count({
    where: whereInput,
  });
  // Transform results using transformer
  const transformedData = await ArrayUtil.asyncMap(data, async (variant) => {
    const transformedProduct =
      await EcommerceMallProductAtSummaryTransformer.transform(variant.product);
    return {
      id: variant.id,
      sku: variant.sku,
      options: JSON.parse(variant.options),
      basePrice: Number(variant.base_price),
      salePrice: variant.sale_price != null ? Number(variant.sale_price) : null,
      stockQuantity: variant.stock_quantity,
      reservedQuantity: variant.reserved_quantity,
      status: variant.status,
      sortOrder: variant.sort_order,
      isDefault: variant.is_default,
      product: transformedProduct,
      createdAt: toISOStringSafe(variant.created_at),
      updatedAt: toISOStringSafe(variant.updated_at),
      deletedAt:
        variant.deleted_at != null ? toISOStringSafe(variant.deleted_at) : null,
    } satisfies IEcommerceMallProductVariant.ISummary;
  });
  return {
    data: transformedData,
    pagination: {
      current: page,
      limit,
      records: total,
      pages: Math.ceil(total / limit),
    } satisfies IPage.IPagination,
  };
}
