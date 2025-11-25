import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IShoppingMallCartItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCartItem";
import { IPageIShoppingMallCartItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallCartItem";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IShoppingMallSaleSku } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSaleSku";
import { IShoppingMallSale } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSale";
import { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
import { IShoppingMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCategory";
import { IShoppingMallBuyer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallBuyer";
import { BuyerPayload } from "../decorators/payload/BuyerPayload";

export async function patchShoppingMallBuyerBuyersMeCart(props: {
  buyer: BuyerPayload;
  body: IShoppingMallCartItem.IRequest;
}): Promise<IPageIShoppingMallCartItem.ISummary> {
  const page = props.body.page ?? 1;
  const limit = props.body.limit ?? 20;
  const skip = (page - 1) * limit;

  const buildWhereCondition = () => {
    const conditions: Record<string, unknown> = {
      shopping_mall_buyer_id: props.buyer.id,
      deleted_at: null,
    };

    const skuConditions: Record<string, unknown> = {};
    const saleConditions: Record<string, unknown> = {};

    if (props.body.search) {
      saleConditions.OR = [
        { title: { contains: props.body.search, mode: "insensitive" } },
        { description: { contains: props.body.search, mode: "insensitive" } },
      ];
    }

    if (props.body.category_ids && props.body.category_ids.length > 0) {
      saleConditions.shopping_mall_category_id = {
        in: props.body.category_ids,
      };
    }

    if (
      props.body.availability_status &&
      props.body.availability_status !== "all"
    ) {
      skuConditions.enabled = props.body.availability_status === "in_stock";
    }

    if (Object.keys(saleConditions).length > 0) {
      skuConditions.sale = saleConditions;
    }

    if (Object.keys(skuConditions).length > 0) {
      conditions.sku = skuConditions;
    }

    if (
      props.body.min_price !== undefined ||
      props.body.max_price !== undefined
    ) {
      const priceCondition: Record<string, unknown> = {};
      if (props.body.min_price !== undefined) {
        priceCondition.gte = props.body.min_price;
      }
      if (props.body.max_price !== undefined) {
        priceCondition.lte = props.body.max_price;
      }
      conditions.unit_price_snapshot = priceCondition;
    }

    return conditions;
  };

  const buildOrderBy = (): any => {
    if (!props.body.sort_by || props.body.sort_by === "date_added") {
      return { created_at: "desc" as const };
    }

    switch (props.body.sort_by) {
      case "price_asc":
        return { unit_price_snapshot: "asc" as const };
      case "price_desc":
        return { unit_price_snapshot: "desc" as const };
      case "name_asc":
        return { sku: { sale: { title: "asc" as const } } };
      case "name_desc":
        return { sku: { sale: { title: "desc" as const } } };
      default:
        return { created_at: "desc" as const };
    }
  };

  const whereCondition = buildWhereCondition();
  const orderBy = buildOrderBy();

  const [cartItems, totalCount] = await Promise.all([
    MyGlobal.prisma.shopping_mall_cart_items.findMany({
      where: whereCondition,
      skip,
      take: limit,
      orderBy,
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
    MyGlobal.prisma.shopping_mall_cart_items.count({
      where: whereCondition,
    }),
  ]);

  const data: IShoppingMallCartItem.ISummary[] = cartItems.map((item: any) => ({
    id: item.id,
    shopping_mall_buyer_id: item.shopping_mall_buyer_id,
    shopping_mall_sale_sku_id: item.shopping_mall_sale_sku_id,
    quantity: item.quantity,
    unit_price_snapshot: item.unit_price_snapshot,
    created_at: toISOStringSafe(item.created_at),
    updated_at: toISOStringSafe(item.updated_at),
    deleted_at: item.deleted_at ? toISOStringSafe(item.deleted_at) : null,
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
        status: item.sku.sale.status,
        condition: item.sku.sale.condition,
        brand: item.sku.sale.brand ?? null,
        short_description: item.sku.sale.short_description ?? null,
        price: item.sku.base_price,
        thumbnail_url: item.sku.sale.thumbnail_url ?? null,
        return_policy_days: item.sku.sale.return_policy_days,
        warranty_info: item.sku.sale.warranty_info ?? null,
        created_at: toISOStringSafe(item.sku.sale.created_at),
        updated_at: toISOStringSafe(item.sku.sale.updated_at),
        deleted_at: item.sku.sale.deleted_at
          ? toISOStringSafe(item.sku.sale.deleted_at)
          : null,
        seller: {
          id: item.sku.sale.seller.id,
          store_name: item.sku.sale.seller.store_name,
          email: item.sku.sale.seller.email,
          status: item.sku.sale.seller.status,
          email_verified: item.sku.sale.seller.email_verified,
        },
        category: {
          id: item.sku.sale.category.id,
          name: item.sku.sale.category.name,
          slug: item.sku.sale.category.slug,
          description: item.sku.sale.category.description ?? null,
          image_url: item.sku.sale.category.image_url ?? null,
          parent_id: item.sku.sale.category.parent_id ?? null,
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
      phone_number: item.buyer.phone_number ?? null,
    },
  }));

  const totalPages = Math.ceil(totalCount / limit);

  return {
    pagination: {
      current: page,
      limit,
      records: totalCount,
      pages: totalPages,
    },
    data,
  };
}
