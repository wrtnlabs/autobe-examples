import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IShoppingMallSale } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSale";
import { IPageIShoppingMallSale } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallSale";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
import { IShoppingMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCategory";

export async function patchShoppingMallSales(props: {
  body: IShoppingMallSale.IRequest;
}): Promise<IPageIShoppingMallSale.ISummary> {
  const page = props.body.page ?? 1;
  const limit = props.body.limit ?? 20;
  const skip = (page - 1) * limit;

  const whereCondition: Record<string, unknown> = {
    deleted_at: null,
  };

  if (props.body.search) {
    whereCondition.title = {
      contains: props.body.search,
      mode: "insensitive",
    };
  }

  if (props.body.seller_id) {
    whereCondition.shopping_mall_seller_id = props.body.seller_id;
  }

  if (props.body.category_id) {
    whereCondition.shopping_mall_category_id = props.body.category_id;
  }

  whereCondition.status = props.body.status ?? "published";

  if (props.body.condition) {
    whereCondition.condition = props.body.condition;
  }

  if (props.body.brand) {
    whereCondition.brand = props.body.brand;
  }

  const hasComplexFiltering =
    props.body.min_price !== undefined ||
    props.body.max_price !== undefined ||
    props.body.has_stock === true ||
    props.body.sort_by === "price_asc" ||
    props.body.sort_by === "price_desc";

  const fetchLimit = hasComplexFiltering ? 1000 : limit;
  const fetchSkip = hasComplexFiltering ? 0 : skip;

  let orderBy: Record<string, unknown>;
  const sortBy = props.body.sort_by;
  if (!hasComplexFiltering) {
    if (sortBy === "title_asc") {
      orderBy = { title: Prisma.SortOrder.asc };
    } else if (sortBy === "title_desc") {
      orderBy = { title: Prisma.SortOrder.desc };
    } else {
      orderBy = { created_at: Prisma.SortOrder.desc };
    }
  } else {
    orderBy = { created_at: Prisma.SortOrder.desc };
  }

  const [sales, totalBeforeComplexFilter] = await Promise.all([
    MyGlobal.prisma.shopping_mall_sales.findMany({
      where: whereCondition,
      skip: fetchSkip,
      take: fetchLimit,
      orderBy,
    }),
    MyGlobal.prisma.shopping_mall_sales.count({ where: whereCondition }),
  ]);

  if (sales.length === 0) {
    return {
      data: [],
      pagination: {
        current: page,
        limit: limit,
        records: 0,
        pages: 0,
      },
    };
  }

  const saleIds = sales.map((s) => s.id);
  const sellerIds = [...new Set(sales.map((s) => s.shopping_mall_seller_id))];
  const categoryIds = [
    ...new Set(sales.map((s) => s.shopping_mall_category_id)),
  ];

  const [sellers, categories, skus, images] = await Promise.all([
    MyGlobal.prisma.shopping_mall_sellers.findMany({
      where: { id: { in: sellerIds } },
    }),
    MyGlobal.prisma.shopping_mall_categories.findMany({
      where: { id: { in: categoryIds } },
    }),
    MyGlobal.prisma.shopping_mall_sale_skus.findMany({
      where: {
        shopping_mall_sale_id: { in: saleIds },
        enabled: true,
      },
      select: {
        shopping_mall_sale_id: true,
        base_price: true,
      },
    }),
    MyGlobal.prisma.shopping_mall_sale_images.findMany({
      where: {
        shopping_mall_sale_id: { in: saleIds },
        is_primary: true,
      },
      select: {
        shopping_mall_sale_id: true,
        url_small: true,
      },
    }),
  ]);

  const sellerMap = new Map(sellers.map((s) => [s.id, s]));
  const categoryMap = new Map(categories.map((c) => [c.id, c]));
  const skuPriceMap = new Map<string, number>();
  for (const sku of skus) {
    const currentMin = skuPriceMap.get(sku.shopping_mall_sale_id);
    if (currentMin === undefined || sku.base_price < currentMin) {
      skuPriceMap.set(sku.shopping_mall_sale_id, sku.base_price);
    }
  }
  const imageMap = new Map(
    images.map((img) => [img.shopping_mall_sale_id, img.url_small]),
  );

  let processedSales = sales.map((sale) => {
    const seller = sellerMap.get(sale.shopping_mall_seller_id);
    const category = categoryMap.get(sale.shopping_mall_category_id);
    const price = skuPriceMap.get(sale.id) ?? 0;
    const thumbnail = imageMap.get(sale.id) ?? null;

    return {
      sale,
      seller,
      category,
      price,
      thumbnail,
    };
  });

  if (props.body.min_price !== undefined) {
    processedSales = processedSales.filter(
      (item) => item.price >= props.body.min_price!,
    );
  }

  if (props.body.max_price !== undefined) {
    processedSales = processedSales.filter(
      (item) => item.price <= props.body.max_price!,
    );
  }

  if (props.body.has_stock === true) {
    processedSales = processedSales.filter((item) =>
      skuPriceMap.has(item.sale.id),
    );
  }

  if (sortBy === "price_asc") {
    processedSales.sort((a, b) => a.price - b.price);
  } else if (sortBy === "price_desc") {
    processedSales.sort((a, b) => b.price - a.price);
  } else if (sortBy === "title_asc") {
    processedSales.sort((a, b) => a.sale.title.localeCompare(b.sale.title));
  } else if (sortBy === "title_desc") {
    processedSales.sort((a, b) => b.sale.title.localeCompare(a.sale.title));
  }

  const totalFiltered = processedSales.length;
  const paginatedResults = processedSales.slice(skip, skip + limit);

  return {
    data: paginatedResults.map((item) => {
      if (!item.seller) {
        throw new HttpException("Seller not found", 500);
      }
      if (!item.category) {
        throw new HttpException("Category not found", 500);
      }

      return {
        id: item.sale.id,
        code: item.sale.code,
        title: item.sale.title,
        status: typia.assert<
          "draft" | "pending_approval" | "published" | "suspended" | "archived"
        >(item.sale.status),
        condition: typia.assert<"new" | "refurbished" | "used">(
          item.sale.condition,
        ),
        brand: item.sale.brand ?? null,
        short_description: item.sale.short_description ?? null,
        price: item.price,
        thumbnail_url: item.thumbnail ?? null,
        return_policy_days: item.sale.return_policy_days,
        warranty_info: item.sale.warranty_info ?? null,
        created_at: toISOStringSafe(item.sale.created_at),
        updated_at: toISOStringSafe(item.sale.updated_at),
        deleted_at: item.sale.deleted_at
          ? toISOStringSafe(item.sale.deleted_at)
          : null,
        seller: {
          id: item.seller.id,
          store_name: item.seller.store_name,
          email: item.seller.email,
          status: typia.assert<
            "pending" | "approved" | "rejected" | "suspended"
          >(item.seller.status),
          email_verified: item.seller.email_verified,
        },
        category: {
          id: item.category.id,
          name: item.category.name,
          slug: item.category.slug,
          description: item.category.description ?? null,
          image_url: item.category.image_url ?? null,
          parent_id: item.category.parent_id ?? null,
          status: item.category.status,
          display_order: item.category.display_order,
          product_count: item.category.product_count,
          created_at: toISOStringSafe(item.category.created_at),
          updated_at: toISOStringSafe(item.category.updated_at),
        },
      };
    }),
    pagination: {
      current: page,
      limit: limit,
      records: hasComplexFiltering ? totalFiltered : totalBeforeComplexFilter,
      pages: Math.ceil(
        (hasComplexFiltering ? totalFiltered : totalBeforeComplexFilter) /
          limit,
      ),
    },
  };
}
