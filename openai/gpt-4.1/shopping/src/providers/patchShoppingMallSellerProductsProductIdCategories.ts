import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IShoppingMallProductsCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductsCategory";
import { IPageIShoppingMallProductsCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallProductsCategory";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { SellerPayload } from "../decorators/payload/SellerPayload";

export async function patchShoppingMallSellerProductsProductIdCategories(props: {
  seller: SellerPayload;
  productId: string & tags.Format<"uuid">;
  body: IShoppingMallProductsCategory.IRequest;
}): Promise<IPageIShoppingMallProductsCategory.ISummary> {
  // 1. Verify product ownership
  const product = await MyGlobal.prisma.shopping_mall_products.findFirst({
    where: {
      id: props.productId,
      shopping_mall_seller_id: props.seller.id,
      deleted_at: null,
    },
    select: { id: true },
  });
  if (!product) {
    throw new HttpException("Product not found or forbidden", 404);
  }

  const { page, limit, search, sort, order } = props.body;
  const skip = (page - 1) * limit;

  // Build filter for search
  let categoryIdsFilter: string[] | undefined = undefined;
  if (search) {
    // Find category ids that match the searched name
    const foundCategories =
      await MyGlobal.prisma.shopping_mall_categories.findMany({
        where: {
          OR: [
            { name: { contains: search } },
            { description: { contains: search } },
          ],
        },
        select: { id: true },
      });
    categoryIdsFilter = foundCategories.map((c) => c.id);
  }

  // Compose where for mappings
  const mappingWhere = {
    shopping_mall_product_id: props.productId,
    ...(categoryIdsFilter && categoryIdsFilter.length > 0
      ? { shopping_mall_category_id: { in: categoryIdsFilter } }
      : {}),
  };

  // Compose sorting
  let orderByClause: any;
  if (sort === "created_at") {
    orderByClause = { created_at: (order ?? "asc") as Prisma.SortOrder };
  } else if (sort === "category_name") {
    // As category name sort isn't supported directly, sort after join in-memory
    orderByClause = { created_at: "asc" as Prisma.SortOrder };
  } else {
    orderByClause = { created_at: "asc" as Prisma.SortOrder };
  }

  // Query mappings
  const [mappings, total] = await Promise.all([
    MyGlobal.prisma.shopping_mall_products_categories.findMany({
      where: mappingWhere,
      orderBy: orderByClause,
      skip,
      take: limit,
    }),
    MyGlobal.prisma.shopping_mall_products_categories.count({
      where: mappingWhere,
    }),
  ]);

  // Fetch categories for mapping
  const uniqueCategoryIds = Array.from(
    new Set(mappings.map((m) => m.shopping_mall_category_id)),
  );
  const categories = await MyGlobal.prisma.shopping_mall_categories.findMany({
    where: { id: { in: uniqueCategoryIds } },
    select: { id: true, name: true },
  });
  const categoryMap = new Map(categories.map((c) => [c.id, c.name]));

  // For ISummary DTO, map back
  let records = mappings.map((mapping) => ({
    id: mapping.shopping_mall_category_id,
    name: categoryMap.get(mapping.shopping_mall_category_id) ?? "",
  }));

  // Sorting by category_name, if needed, only in-memory
  if (sort === "category_name") {
    records = records.sort((a, b) => {
      const cmp = a.name.localeCompare(b.name);
      return (order ?? "asc") === "desc" ? -cmp : cmp;
    });
  }

  // Pagination: return only the requested page slice
  const paginatedData = records; // Already paginated via prisma findMany

  return {
    pagination: {
      current: page,
      limit: limit,
      records: total,
      pages: Math.ceil(total / limit),
    },
    data: paginatedData,
  };
}
