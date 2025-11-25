import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IShoppingMallProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductVariant";
import { IPageIShoppingMallProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallProductVariant";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { AdminPayload } from "../decorators/payload/AdminPayload";

export async function patchShoppingMallAdminProductsProductIdVariants(props: {
  admin: AdminPayload;
  productId: string & tags.Format<"uuid">;
  body: IShoppingMallProductVariant.IRequest;
}): Promise<IPageIShoppingMallProductVariant.ISummary> {
  // Validate pagination limits
  const page = Math.max(1, props.body.page ?? 1);
  const limit = Math.min(Math.max(1, props.body.limit ?? 100), 1000); // Cap at 1000 for safety

  // Verify the product exists
  const product = await MyGlobal.prisma.shopping_mall_products.findUnique({
    where: { id: props.productId, deleted_at: null },
  });

  if (!product) {
    throw new HttpException("Product not found", 404);
  }

  // Build where conditions
  const where: Record<string, unknown> = {
    shopping_mall_product_id: props.productId,
    deleted_at: null,
  };

  // Apply search filter
  if (props.body.search) {
    where.OR = [
      { variant_name: { contains: props.body.search, mode: "insensitive" } },
      { sku: { contains: props.body.search, mode: "insensitive" } },
    ];
  }

  // Apply active status filter
  if (props.body.active !== undefined && props.body.active !== null) {
    where.active = props.body.active;
  }

  // Apply stock quantity filters
  if (props.body.min_stock !== undefined && props.body.min_stock !== null) {
    where.stock_quantity = {
      ...((where.stock_quantity as Record<string, unknown>) || {}),
      gte: props.body.min_stock,
    };
  }

  if (props.body.max_stock !== undefined && props.body.max_stock !== null) {
    where.stock_quantity = {
      ...((where.stock_quantity as Record<string, unknown>) || {}),
      lte: props.body.max_stock,
    };
  }

  // Apply price filters
  if (props.body.min_price !== undefined && props.body.min_price !== null) {
    where.price = {
      ...((where.price as Record<string, unknown>) || {}),
      gte: props.body.min_price,
    };
  }

  if (props.body.max_price !== undefined && props.body.max_price !== null) {
    where.price = {
      ...((where.price as Record<string, unknown>) || {}),
      lte: props.body.max_price,
    };
  }

  const skip = (page - 1) * limit;

  // Order by configuration
  const orderBy: Record<string, "asc" | "desc"> = {};
  if (props.body.order_by) {
    const direction = props.body.order_direction === "desc" ? "desc" : "asc";
    orderBy[props.body.order_by] = direction;
  } else {
    orderBy.created_at = "desc";
  }

  // Execute concurrent queries
  const [variants, total] = await Promise.all([
    MyGlobal.prisma.shopping_mall_product_variants.findMany({
      where,
      skip,
      take: limit,
      orderBy,
    }),
    MyGlobal.prisma.shopping_mall_product_variants.count({ where }),
  ]);

  // Transform results with proper null handling
  const data = variants.map((variant) => ({
    id: variant.id,
    variant_name: variant.variant_name,
    sku: variant.sku,
    price: variant.price ?? 0,
    stock_quantity: variant.stock_quantity,
    active: variant.active,
  }));

  return {
    data,
    pagination: {
      current: page,
      limit,
      records: total,
      pages: Math.ceil(total / limit),
    },
  };
}
