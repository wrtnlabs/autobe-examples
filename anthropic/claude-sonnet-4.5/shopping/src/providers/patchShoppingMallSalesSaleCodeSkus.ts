import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IShoppingMallSaleSku } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSaleSku";
import { IPageIShoppingMallSaleSku } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallSaleSku";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IShoppingMallSale } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSale";
import { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
import { IShoppingMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCategory";

export async function patchShoppingMallSalesSaleCodeSkus(props: {
  saleCode: string;
  body: IShoppingMallSaleSku.IRequest;
}): Promise<IPageIShoppingMallSaleSku.ISummary> {
  const sale = await MyGlobal.prisma.shopping_mall_sales.findFirst({
    where: {
      code: props.saleCode,
      deleted_at: null,
    },
  });

  if (!sale) {
    throw new HttpException("Sale not found", 404);
  }

  const [seller, category] = await Promise.all([
    MyGlobal.prisma.shopping_mall_sellers.findUnique({
      where: { id: sale.shopping_mall_seller_id },
    }),
    MyGlobal.prisma.shopping_mall_categories.findUnique({
      where: { id: sale.shopping_mall_category_id },
    }),
  ]);

  if (!seller || !category) {
    throw new HttpException("Sale data integrity error", 500);
  }

  const page = props.body.page ?? 1;
  const limit = props.body.limit ?? 20;
  const skip = (page - 1) * limit;

  const baseWhereCondition = {
    shopping_mall_sale_id: sale.id,
    ...(props.body.search && {
      OR: [
        { sku_code: { contains: props.body.search } },
        { variant_combination: { contains: props.body.search } },
      ],
    }),
    ...(props.body.variant_value_ids &&
      props.body.variant_value_ids.length > 0 && {
        shopping_mall_sale_sku_variant_values: {
          some: {
            shopping_mall_sale_variant_value_id: {
              in: props.body.variant_value_ids,
            },
          },
        },
      }),
    ...((props.body.min_price !== undefined ||
      props.body.max_price !== undefined) && {
      base_price: {
        ...(props.body.min_price !== undefined && {
          gte: props.body.min_price,
        }),
        ...(props.body.max_price !== undefined && {
          lte: props.body.max_price,
        }),
      },
    }),
    ...(props.body.is_active !== undefined && {
      enabled: props.body.is_active,
    }),
  };

  const hasStockFilter =
    props.body.min_stock !== undefined || props.body.max_stock !== undefined;

  let skus;
  let total;

  if (hasStockFilter) {
    const allSkus = await MyGlobal.prisma.shopping_mall_sale_skus.findMany({
      where: baseWhereCondition,
      include: {
        shopping_mall_inventory_stocks: true,
      },
    });

    const filteredSkus = allSkus.filter((sku) => {
      if (!sku.shopping_mall_inventory_stocks) return false;

      const meetsMinStock =
        props.body.min_stock === undefined ||
        sku.shopping_mall_inventory_stocks.available_quantity >=
          props.body.min_stock;
      const meetsMaxStock =
        props.body.max_stock === undefined ||
        sku.shopping_mall_inventory_stocks.available_quantity <=
          props.body.max_stock;

      return meetsMinStock && meetsMaxStock;
    });

    total = filteredSkus.length;

    const sortedSkus = [...filteredSkus];
    if (props.body.sort_by) {
      const sortField =
        props.body.sort_by === "price" ? "base_price" : props.body.sort_by;
      const sortOrder = props.body.sort_order ?? "asc";

      sortedSkus.sort((a, b) => {
        const aVal = a[sortField as keyof typeof a] ?? 0;
        const bVal = b[sortField as keyof typeof b] ?? 0;
        if (aVal < bVal) return sortOrder === "asc" ? -1 : 1;
        if (aVal > bVal) return sortOrder === "asc" ? 1 : -1;
        return 0;
      });
    }

    skus = sortedSkus.slice(skip, skip + limit);
  } else {
    [skus, total] = await Promise.all([
      MyGlobal.prisma.shopping_mall_sale_skus.findMany({
        where: baseWhereCondition,
        skip,
        take: limit,
        ...(props.body.sort_by && {
          orderBy: {
            [props.body.sort_by === "price"
              ? "base_price"
              : props.body.sort_by]: props.body.sort_order ?? "asc",
          },
        }),
      }),
      MyGlobal.prisma.shopping_mall_sale_skus.count({
        where: baseWhereCondition,
      }),
    ]);
  }

  return {
    pagination: {
      current: page,
      limit: limit,
      records: total,
      pages: Math.ceil(total / limit),
    },
    data: skus.map((sku) => ({
      id: sku.id,
      sku_code: sku.sku_code,
      variant_combination: sku.variant_combination,
      base_price: sku.base_price,
      price: sku.sale_price ?? sku.base_price,
      enabled: sku.enabled,
      sale: {
        id: sale.id,
        code: sale.code,
        title: sale.title,
        status: typia.assert<
          "draft" | "pending_approval" | "published" | "suspended" | "archived"
        >(sale.status),
        condition: typia.assert<"new" | "refurbished" | "used">(sale.condition),
        brand: sale.brand === null ? undefined : sale.brand,
        short_description:
          sale.short_description === null ? undefined : sale.short_description,
        price: sku.base_price,
        thumbnail_url: undefined,
        return_policy_days: sale.return_policy_days,
        warranty_info:
          sale.warranty_info === null ? undefined : sale.warranty_info,
        created_at: toISOStringSafe(sale.created_at),
        updated_at: toISOStringSafe(sale.updated_at),
        deleted_at:
          sale.deleted_at === null
            ? undefined
            : toISOStringSafe(sale.deleted_at),
        seller: {
          id: seller.id,
          store_name: seller.store_name,
          email: seller.email,
          status: typia.assert<
            "pending" | "approved" | "rejected" | "suspended"
          >(seller.status),
          email_verified: seller.email_verified,
        },
        category: {
          id: category.id,
          name: category.name,
          slug: category.slug,
          description:
            category.description === null ? undefined : category.description,
          image_url:
            category.image_url === null ? undefined : category.image_url,
          parent_id:
            category.parent_id === null ? undefined : category.parent_id,
          status: category.status,
          display_order: category.display_order,
          product_count: category.product_count,
          created_at: toISOStringSafe(category.created_at),
          updated_at: toISOStringSafe(category.updated_at),
        },
      },
    })),
  };
}
