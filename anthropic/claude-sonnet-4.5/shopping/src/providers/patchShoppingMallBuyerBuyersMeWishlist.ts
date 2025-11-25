import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IShoppingMallWishlistItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallWishlistItem";
import { IPageIShoppingMallWishlistItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallWishlistItem";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IShoppingMallSaleSku } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSaleSku";
import { IShoppingMallSale } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSale";
import { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
import { IShoppingMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCategory";
import { IShoppingMallBuyer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallBuyer";
import { BuyerPayload } from "../decorators/payload/BuyerPayload";

export async function patchShoppingMallBuyerBuyersMeWishlist(props: {
  buyer: BuyerPayload;
  body: IShoppingMallWishlistItem.IRequest;
}): Promise<IPageIShoppingMallWishlistItem.ISummary> {
  const page = props.body.page ?? 1;
  const limit = props.body.limit ?? 100;
  const skip = (page - 1) * limit;

  const whereCondition: Record<string, unknown> = {
    shopping_mall_buyer_id: props.buyer.id,
    deleted_at: null,
  };

  if (
    props.body.search ||
    props.body.category_id ||
    props.body.min_price !== undefined ||
    props.body.max_price !== undefined
  ) {
    const skuConditions: Record<string, unknown> = {};
    const saleConditions: Record<string, unknown> = {};

    if (props.body.search) {
      saleConditions.title = { contains: props.body.search };
    }

    if (props.body.category_id) {
      saleConditions.shopping_mall_category_id = props.body.category_id;
    }

    if (
      props.body.min_price !== undefined ||
      props.body.max_price !== undefined
    ) {
      const priceFilter: Record<string, unknown> = {};
      if (props.body.min_price !== undefined) {
        priceFilter.gte = props.body.min_price;
      }
      if (props.body.max_price !== undefined) {
        priceFilter.lte = props.body.max_price;
      }
      skuConditions.base_price = priceFilter;
    }

    if (Object.keys(saleConditions).length > 0) {
      skuConditions.sale = saleConditions;
    }

    if (Object.keys(skuConditions).length > 0) {
      whereCondition.sku = skuConditions;
    }
  }

  if (props.body.added_after || props.body.added_before) {
    const createdAtFilter: Record<string, unknown> = {};
    if (props.body.added_after) {
      createdAtFilter.gte = new Date(props.body.added_after);
    }
    if (props.body.added_before) {
      createdAtFilter.lte = new Date(props.body.added_before);
    }
    whereCondition.created_at = createdAtFilter;
  }

  let orderByClause: Record<string, unknown> = { created_at: "desc" };

  if (props.body.sort_by === "created_at") {
    orderByClause = { created_at: props.body.sort_order ?? "desc" };
  } else if (props.body.sort_by === "price") {
    orderByClause = {
      sku: {
        base_price: props.body.sort_order ?? "asc",
      },
    };
  } else if (props.body.sort_by === "product_name") {
    orderByClause = {
      sku: {
        sale: {
          title: props.body.sort_order ?? "asc",
        },
      },
    };
  }

  const [data, total] = await Promise.all([
    MyGlobal.prisma.shopping_mall_wishlist_items.findMany({
      where: whereCondition as never,
      skip,
      take: limit,
      orderBy: orderByClause as never,
      include: {
        sku: {
          include: {
            sale: {
              include: {
                seller: true,
                category: true,
              },
            },
          },
        },
        buyer: true,
      },
    }),
    MyGlobal.prisma.shopping_mall_wishlist_items.count({
      where: whereCondition as never,
    }),
  ]);

  const mappedData: IShoppingMallWishlistItem.ISummary[] = data.map((item) => ({
    id: item.id,
    created_at: toISOStringSafe(item.created_at),
    price_snapshot: item.price_snapshot,
    updated_at: toISOStringSafe(item.updated_at),
    deleted_at: item.deleted_at ? toISOStringSafe(item.deleted_at) : undefined,
    sku: {
      id: item.sku.id,
      sku_code: item.sku.sku_code,
      variant_combination: item.sku.variant_combination,
      base_price: item.sku.base_price,
      price: item.sku.sale_price ?? item.sku.base_price,
      enabled: item.sku.enabled,
      sale: {
        id: item.sku.sale.id,
        code: item.sku.sale.code,
        title: item.sku.sale.title,
        status: typia.assert<
          "draft" | "pending_approval" | "published" | "suspended" | "archived"
        >(item.sku.sale.status),
        condition: typia.assert<"new" | "refurbished" | "used">(
          item.sku.sale.condition,
        ),
        brand: item.sku.sale.brand ?? undefined,
        short_description: item.sku.sale.short_description ?? undefined,
        price: item.sku.base_price,
        thumbnail_url: undefined,
        return_policy_days: item.sku.sale.return_policy_days,
        warranty_info: item.sku.sale.warranty_info ?? undefined,
        created_at: toISOStringSafe(item.sku.sale.created_at),
        updated_at: toISOStringSafe(item.sku.sale.updated_at),
        deleted_at: item.sku.sale.deleted_at
          ? toISOStringSafe(item.sku.sale.deleted_at)
          : undefined,
        seller: {
          id: item.sku.sale.seller.id,
          store_name: item.sku.sale.seller.store_name,
          email: item.sku.sale.seller.email,
          status: typia.assert<
            "pending" | "approved" | "rejected" | "suspended"
          >(item.sku.sale.seller.status),
          email_verified: item.sku.sale.seller.email_verified,
        },
        category: {
          id: item.sku.sale.category.id,
          name: item.sku.sale.category.name,
          slug: item.sku.sale.category.slug,
          description: item.sku.sale.category.description ?? undefined,
          image_url: item.sku.sale.category.image_url ?? undefined,
          parent_id: item.sku.sale.category.parent_id ?? undefined,
          status: item.sku.sale.category.status,
          display_order: item.sku.sale.category.display_order,
          product_count: item.sku.sale.category.product_count,
          created_at: toISOStringSafe(item.sku.sale.category.created_at),
          updated_at: toISOStringSafe(item.sku.sale.category.updated_at),
        },
      },
    },
    buyer: {
      id: item.buyer.id,
      email: item.buyer.email,
      full_name: item.buyer.full_name,
      phone_number: item.buyer.phone_number ?? undefined,
    },
  }));

  const pages = Math.ceil(total / limit);

  return {
    pagination: {
      current: page,
      limit,
      records: total,
      pages,
    },
    data: mappedData,
  };
}
