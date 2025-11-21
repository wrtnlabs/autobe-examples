import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IShoppingMallProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductVariant";
import { IPageIShoppingMallProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallProductVariant";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { SellerPayload } from "../decorators/payload/SellerPayload";

export async function patchShoppingMallSellerProductsProductIdVariants(props: {
  seller: SellerPayload;
  productId: string & tags.Format<"uuid">;
  body: IShoppingMallProductVariant.IRequest;
}): Promise<IPageIShoppingMallProductVariant.ISummary> {
  // Verify the seller owns the product
  const product = await MyGlobal.prisma.shopping_mall_products.findFirst({
    where: {
      id: props.productId,
      shopping_mall_seller_id: props.seller.id,
      deleted_at: null,
    },
  });

  if (!product) {
    throw new HttpException("Product not found or access denied", 404);
  }

  // Build WHERE conditions
  const whereConditions: Record<string, unknown> = {
    shopping_mall_product_id: props.productId,
    deleted_at: null,
  };

  // Search filter
  if (props.body.search) {
    whereConditions.OR = [
      { variant_name: { contains: props.body.search, mode: "insensitive" } },
      { sku: { contains: props.body.search, mode: "insensitive" } },
    ];
  }

  // Active status filter
  if (props.body.active !== undefined && props.body.active !== null) {
    whereConditions.active = props.body.active;
  }

  // Stock quantity range filter
  const stockConditions: Record<string, unknown> = {};
  if (props.body.min_stock !== undefined && props.body.min_stock !== null) {
    stockConditions.gte = props.body.min_stock;
  }
  if (props.body.max_stock !== undefined && props.body.max_stock !== null) {
    stockConditions.lte = props.body.max_stock;
  }
  if (Object.keys(stockConditions).length > 0) {
    whereConditions.stock_quantity = stockConditions;
  }

  // Price range filter
  const priceConditions: Record<string, unknown> = {};
  if (props.body.min_price !== undefined && props.body.min_price !== null) {
    priceConditions.gte = props.body.min_price;
  }
  if (props.body.max_price !== undefined && props.body.max_price !== null) {
    priceConditions.lte = props.body.max_price;
  }
  if (Object.keys(priceConditions).length > 0) {
    whereConditions.price = priceConditions;
  }

  // Pagination with validation
  const page = Math.max(1, props.body.page ?? 1);
  const limit = Math.min(Math.max(1, props.body.limit ?? 100), 1000); // Cap at 1000
  const skip = (page - 1) * limit;

  // Sorting
  const orderBy: Record<string, unknown> = {};
  const direction = props.body.order_direction === "desc" ? "desc" : "asc";

  switch (props.body.order_by) {
    case "variant_name":
      orderBy.variant_name = direction;
      break;
    case "price":
      orderBy.price = direction;
      break;
    case "stock_quantity":
      orderBy.stock_quantity = direction;
      break;
    case "created_at":
    default:
      orderBy.created_at = direction;
      break;
  }

  // Execute queries concurrently
  const [variants, total] = await Promise.all([
    MyGlobal.prisma.shopping_mall_product_variants.findMany({
      where: whereConditions,
      skip,
      take: limit,
      orderBy,
    }),
    MyGlobal.prisma.shopping_mall_product_variants.count({
      where: whereConditions,
    }),
  ]);

  // Transform results with proper type constraints
  const data = variants.map((variant) => ({
    id: variant.id as string & tags.Format<"uuid">,
    variant_name: variant.variant_name,
    sku: variant.sku,
    price: variant.price ?? product.price, // Use product price if variant price is null
    stock_quantity: variant.stock_quantity as number & tags.Type<"int32">,
    active: variant.active,
  }));

  return {
    pagination: {
      current: page as number & tags.Type<"int32"> & tags.Minimum<0>,
      limit: limit as number & tags.Type<"int32"> & tags.Minimum<0>,
      records: total as number & tags.Type<"int32"> & tags.Minimum<0>,
      pages: Math.ceil(total / limit) as number &
        tags.Type<"int32"> &
        tags.Minimum<0>,
    },
    data,
  };
}
