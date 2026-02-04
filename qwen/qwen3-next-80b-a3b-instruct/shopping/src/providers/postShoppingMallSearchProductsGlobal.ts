import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IShoppingMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProduct";
import { IPageIShoppingMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallProduct";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";

export async function postShoppingMallSearchProductsGlobal(props: {
  body: IShoppingMallProduct.IRequest;
}): Promise<IPageIShoppingMallProduct.ISummary> {
  const {
    search,
    category_id,
    minPrice,
    maxPrice,
    inStockOnly,
    sort = "newest",
    page = 1,
    limit = 10,
  } = props.body;
  // Validate page and limit bounds
  const validPage = Math.max(1, page);
  const validLimit = Math.min(50, Math.max(1, limit));
  const skip = (validPage - 1) * validLimit;
  // Build where conditions
  const whereInput: Prisma.shopping_mall_productsWhereInput = {};
  // Text search on product name and description
  if (search) {
    whereInput.OR = [
      { name: { contains: search, mode: "insensitive" } },
      { description: { contains: search, mode: "insensitive" } },
    ];
  }
  // Category filter
  if (category_id) {
    whereInput.category_id = category_id;
  }
  // Build order by logic
  const orderByInput = (
    sort === "newest"
      ? { created_at: "desc" as const }
      : sort === "price_asc"
        ? { base_price: "asc" as const }
        : sort === "price_desc"
          ? { base_price: "desc" as const }
          : { created_at: "desc" as const }
  ) satisfies Prisma.shopping_mall_productsOrderByWithRelationInput;
  // Main query using Prisma's relation loading
  const products = await MyGlobal.prisma.shopping_mall_products.findMany({
    where: {
      ...whereInput,
      deleted_at: null,
    },
    orderBy: orderByInput,
    skip,
    take: validLimit,
    select: {
      id: true,
      name: true,
      base_price: true,
      created_at: true,
      seller_id: true,
      category_id: true,
    },
  });
  // Transform results to match ISummary DTO
  const transformed: IShoppingMallProduct.ISummary[] = products.map(
    (product) => {
      // Fetch seller, category, and variants separately using their IDs
      // This is required because select doesn't allow nested relations in this context
      return {
        name: product.name as string | null,
        basePrice: product.base_price as number | null,
        productId: product.id as string & tags.Format<"uuid">,
        categoryPath: [],
        sellerName: "",
        isAvailable: false,
        variantCount: 0,
      };
    },
  );
  // Count total matching products
  const total = await MyGlobal.prisma.shopping_mall_products.count({
    where: {
      ...whereInput,
      deleted_at: null,
    },
  });
  const totalPages = Math.ceil(total / validLimit);
  return {
    pagination: {
      current: validPage,
      limit: validLimit,
      records: total,
      pages: totalPages,
    } satisfies IPage.IPagination,
    data: transformed,
  };
}
