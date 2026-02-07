import { IEcommerceProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceProductVariant";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageIEcommerceProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEcommerceProductVariant";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchEcommerceProductsProductIdVariants(props: {
  productId: string & tags.Format<"uuid">;
  body: IEcommerceProductVariant.IRequest;
}): Promise<IPageIEcommerceProductVariant.ISummary> {
  // Verify product exists
  const product = await MyGlobal.prisma.ecommerce_products.findUnique({
    where: { id: props.productId },
  });
  if (!product) {
    throw new HttpException("Product not found", 404);
  }
  const { sku, minPrice, maxPrice, includeOutOfStock = false } = props.body;
  const page = 1 satisfies number & tags.Type<"int32"> & tags.Minimum<0>;
  const limit = 50 satisfies number & tags.Type<"int32"> & tags.Minimum<0>;
  const skip = (page - 1) * limit;
  const whereInput = {
    products_id: props.productId,
    ...(sku && { sku: { contains: sku.toLowerCase(), mode: "insensitive" } }),
    ...(minPrice !== undefined && { price: { gte: minPrice } }),
    ...(maxPrice !== undefined && { price: { lte: maxPrice } }),
    ...(includeOutOfStock ? { stock_quantity: { gt: 0 } } : null),
  };
  const data = await MyGlobal.prisma.ecommerce_product_variants.findMany({
    where: whereInput,
    orderBy: { sku: "asc" },
    skip,
    take: limit,
    select: {
      sku: true,
      price: true,
      stock_quantity: true,
      created_at: true,
    },
  });
  const count = await MyGlobal.prisma.ecommerce_product_variants.count({
    where: whereInput,
  });
  const transformedData = data.map((variant) => ({
    sku: variant.sku,
    price: variant.price,
    stock_quantity: variant.stock_quantity,
    created_at: toISOStringSafe(variant.created_at),
  }));
  return {
    data: transformedData,
    pagination: {
      current: page,
      limit: limit,
      records: count,
      pages: Math.ceil(count / limit) satisfies number &
        tags.Type<"int32"> &
        tags.Minimum<0>,
    },
  };
}
