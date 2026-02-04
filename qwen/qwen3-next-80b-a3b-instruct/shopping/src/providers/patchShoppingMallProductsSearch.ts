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

export async function patchShoppingMallProductsSearch(props: {
  body: IShoppingMallProduct.IRequest;
}): Promise<IPageIShoppingMallProduct.ISummary> {
  const {
    search,
    category_id,
    minPrice,
    maxPrice,
    inStockOnly,
    sort,
    page = 1,
    limit = 10,
  } = props.body;
  // Build where condition
  const whereInput = {
    deleted_at: null,
    ...(search && { name: { contains: search, mode: "insensitive" } }),
    ...(category_id && { category_id }),
  } satisfies Prisma.shopping_mall_productsWhereInput;
  // Build orderBy condition
  const orderByInput = (
    sort === "newest"
      ? { created_at: "desc" as const }
      : sort === "price_asc"
        ? { base_price: "asc" as const }
        : sort === "price_desc"
          ? { base_price: "desc" as const }
          : { created_at: "desc" as const }
  ) satisfies Prisma.shopping_mall_productsOrderByWithRelationInput;
  // Get total count for pagination
  const total = await MyGlobal.prisma.shopping_mall_products.count({
    where: whereInput,
  });
  // Calculate pagination offset
  const skip = (page - 1) * limit;
  // Get products with necessary fields
  const data = await MyGlobal.prisma.shopping_mall_products.findMany({
    where: whereInput,
    orderBy: orderByInput,
    skip,
    take: limit,
    select: {
      id: true,
      name: true,
      base_price: true,
      category_id: true,
      seller_id: true,
      created_at: true,
      updated_at: true,
      // Only select what we need for summary
    },
  });
  // Get category paths using direct queries (since category names are needed for path)
  const categoryMap: Record<string, string[]> = {};
  if (data.length > 0) {
    const categoryIds = [...new Set(data.map((p) => p.category_id))];
    const categories = await MyGlobal.prisma.shopping_mall_sections.findMany({
      where: { id: { in: categoryIds } },
      select: { id: true, name: true, parent_section_id: true },
    });
    // Build category hierarchy map (simplified as flat for this example)
    const categoryLookup = new Map(categories.map((cat) => [cat.id, cat.name]));
    data.forEach((product) => {
      const categoryPath: string[] = [];
      let currentId = product.category_id;
      let category = categories.find((c) => c.id === currentId);
      while (category) {
        categoryPath.unshift(category.name);
        if (category.parent_section_id) {
          currentId = category.parent_section_id;
          category = categories.find((c) => c.id === currentId);
        } else {
          break;
        }
      }
      categoryMap[product.id] = categoryPath;
    });
  }
  // Get seller names
  const sellerIds = [...new Set(data.map((p) => p.seller_id))];
  const sellers = await MyGlobal.prisma.shopping_mall_sellers.findMany({
    where: { id: { in: sellerIds } },
    select: { id: true, shop_name: true },
  });
  const sellerMap = new Map(sellers.map((s) => [s.id, s.shop_name]));
  // Get product images (first image per product)
  const productIds = data.map((p) => p.id);
  const images = await MyGlobal.prisma.shopping_mall_product_images.findMany({
    where: { shopping_mall_product_id: { in: productIds } },
    orderBy: { image_order: "asc" },
    take: 1,
    select: { shopping_mall_product_id: true, image_url: true },
  });
  const imageMap = new Map(
    images.map((img) => [img.shopping_mall_product_id, img.image_url]),
  );
  // Get inventory levels (for inStockOnly and availability)
  const inventoryQuery =
    await MyGlobal.prisma.shopping_mall_inventory_records.groupBy({
      by: ["id"],
      where: { id: { in: productIds } },
      _sum: { quantity_change: true },
    });
  const inventoryMap = new Map(
    inventoryQuery.map((rec) => [rec.id, rec._sum?.quantity_change || 0]),
  );
  // Transform to IShoppingMallProduct.ISummary
  const summaries: IShoppingMallProduct.ISummary[] = data.map((product) => {
    // Calculate if product is available (has at least one variant with positive stock)
    // Note: We don't have product variants in schema - assuming base product has stock
    const totalStock = inventoryMap.get(product.id) || 0;
    const isAvailable = totalStock > 0;
    // Calculate variant count - since we don't have variants, we'll assume 1
    // In reality, this would come from variants table
    const variantCount = 1; // Placeholder
    // Get price - if minPrice/maxPrice filters are applied, we need to consider product variants
    // Since we don't have variant table, we'll use base_price as default
    const price = product.base_price;
    // Determine if product matches price filters
    const matchesPriceRange =
      (!minPrice || price >= minPrice) && (!maxPrice || price <= maxPrice);
    // This logic is simplified - we would need variant price checking in real implementation
    return {
      name: product.name,
      basePrice: product.base_price,
      productId: product.id,
      categoryPath: categoryMap[product.id] || [],
      sellerName: sellerMap.get(product.seller_id) || "",
      isAvailable,
      variantCount,
    };
  });
  // Filter by inStockOnly if specified
  const filteredSummaries = inStockOnly
    ? summaries.filter((summary) => summary.isAvailable)
    : summaries;
  // Apply price filtering (simplified due to missing variant data)
  const finalSummaries = filteredSummaries.filter((summary) => {
    if (minPrice && summary.basePrice! < minPrice) return false;
    if (maxPrice && summary.basePrice! > maxPrice) return false;
    return true;
  });
  // Calculate pagination
  const pages = Math.ceil(total / limit);
  return {
    pagination: {
      current: page,
      limit,
      records: finalSummaries.length,
      pages,
    } satisfies IPage.IPagination,
    data: finalSummaries,
  };
}
