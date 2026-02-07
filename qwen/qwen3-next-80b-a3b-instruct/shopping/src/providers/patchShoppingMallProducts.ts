import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageIShoppingMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallProduct";
import { IShoppingMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProduct";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchShoppingMallProducts(props: {
  body: IShoppingMallProduct.IRequest;
}): Promise<IPageIShoppingMallProduct.ISummary> {
  // Page and limit defaults from specification
  const page = 1;
  const limit = 100;
  const skip = (page - 1) * limit;
  // Build dynamic WHERE clause based on operation specification
  const whereInput: Prisma.shopping_mall_productsWhereInput = {
    deleted_at: null,
  };
  // Extract search parameters from request body using type assertion
  const body: any = props.body;
  // Text search filters
  if (body.name !== undefined && body.name !== null) {
    whereInput.name = { contains: body.name };
  }
  if (body.description !== undefined && body.description !== null) {
    whereInput.description = { contains: body.description };
  }
  // Price range filters - use FloatFilter structure
  if (body.base_price_min !== undefined) {
    if (!whereInput.base_price) whereInput.base_price = {};
    whereInput.base_price.gte = body.base_price_min;
  }
  if (body.base_price_max !== undefined) {
    if (!whereInput.base_price) whereInput.base_price = {};
    whereInput.base_price.lte = body.base_price_max;
  }
  // Created at range filters - use DateTimeFilter structure
  if (body.created_at_min !== undefined && body.created_at_min !== null) {
    if (!whereInput.created_at) whereInput.created_at = {};
    whereInput.created_at.gte = body.created_at_min;
  }
  if (body.created_at_max !== undefined && body.created_at_max !== null) {
    if (!whereInput.created_at) whereInput.created_at = {};
    whereInput.created_at.lte = body.created_at_max;
  }
  // Updated at range filters - use DateTimeFilter structure
  if (body.updated_at_min !== undefined && body.updated_at_min !== null) {
    if (!whereInput.updated_at) whereInput.updated_at = {};
    whereInput.updated_at.gte = body.updated_at_min;
  }
  if (body.updated_at_max !== undefined && body.updated_at_max !== null) {
    if (!whereInput.updated_at) whereInput.updated_at = {};
    whereInput.updated_at.lte = body.updated_at_max;
  }
  // Get products that have at least one active variant
  const products = await MyGlobal.prisma.shopping_mall_products.findMany({
    where: whereInput,
    skip,
    take: limit,
    orderBy: { created_at: "desc" },
    select: {
      id: true,
      name: true,
      description: true,
      base_price: true,
      created_at: true,
      updated_at: true,
      variants: {
        where: {
          stock: { gt: 0 },
          deleted_at: null,
        },
        take: 1, // Only need to check existence
      },
    },
  });
  // Filter only products that have at least one active variant
  const productsWithVariants = products.filter((p) => p.variants.length > 0);
  // Transform to summary format with proper date formatting
  const summary = productsWithVariants.map((p) => ({
    id: p.id,
    name: p.name,
    description: p.description,
    base_price: p.base_price,
    created_at: toISOStringSafe(p.created_at),
    updated_at: toISOStringSafe(p.updated_at),
  }));
  // Count total products matching criteria
  const total = await MyGlobal.prisma.shopping_mall_products.count({
    where: whereInput,
  });
  // Calculate pagination
  const pages = Math.ceil(total / limit);
  return {
    data: summary,
    pagination: {
      current: page,
      limit,
      records: total,
      pages,
    } satisfies IPage.IPagination,
  };
}
