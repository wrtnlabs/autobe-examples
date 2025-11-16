import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IShoppingMallOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrderItem";
import { IPageIShoppingMallOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallOrderItem";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IShoppingMallSaleSku } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSaleSku";
import { IShoppingMallSale } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSale";
import { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
import { IShoppingMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCategory";
import { BuyerPayload } from "../decorators/payload/BuyerPayload";

export async function patchShoppingMallBuyerOrdersOrderIdItems(props: {
  buyer: BuyerPayload;
  orderId: string & tags.Format<"uuid">;
  body: IShoppingMallOrderItem.IRequest;
}): Promise<IPageIShoppingMallOrderItem.ISummary> {
  const order = await MyGlobal.prisma.shopping_mall_orders.findUnique({
    where: { id: props.orderId },
    select: {
      id: true,
      shopping_mall_buyer_id: true,
      deleted_at: true,
    },
  });

  if (!order) {
    throw new HttpException("Order not found", 404);
  }

  if (order.deleted_at !== null) {
    throw new HttpException("Order not found", 404);
  }

  if (order.shopping_mall_buyer_id !== props.buyer.id) {
    throw new HttpException("Forbidden", 403);
  }

  const page = props.body.page ?? 1;
  const limit = props.body.limit ?? 100;
  const skip = (page - 1) * limit;

  const sortBy = props.body.sort_by ?? "created_at";
  const sortOrder = props.body.order ?? "desc";

  const [items, total] = await Promise.all([
    MyGlobal.prisma.shopping_mall_order_items.findMany({
      where: {
        shopping_mall_order_id: props.orderId,
        deleted_at: null,
        ...(props.body.search && {
          OR: [
            { product_name: { contains: props.body.search } },
            { sku_code: { contains: props.body.search } },
          ],
        }),
        ...(props.body.min_price !== undefined && {
          unit_price: { gte: props.body.min_price },
        }),
        ...(props.body.max_price !== undefined && {
          unit_price: { lte: props.body.max_price },
        }),
        ...(props.body.seller_id && {
          shopping_mall_order_seller_id: props.body.seller_id,
        }),
      },
      orderBy: {
        [sortBy]: sortOrder,
      },
      skip,
      take: limit,
      include: {
        saleSku: {
          include: {
            sale: {
              include: {
                seller: true,
                category: true,
              },
            },
          },
        },
      },
    }),
    MyGlobal.prisma.shopping_mall_order_items.count({
      where: {
        shopping_mall_order_id: props.orderId,
        deleted_at: null,
        ...(props.body.search && {
          OR: [
            { product_name: { contains: props.body.search } },
            { sku_code: { contains: props.body.search } },
          ],
        }),
        ...(props.body.min_price !== undefined && {
          unit_price: { gte: props.body.min_price },
        }),
        ...(props.body.max_price !== undefined && {
          unit_price: { lte: props.body.max_price },
        }),
        ...(props.body.seller_id && {
          shopping_mall_order_seller_id: props.body.seller_id,
        }),
      },
    }),
  ]);

  return {
    pagination: {
      current: page,
      limit: limit,
      records: total,
      pages: Math.ceil(total / limit),
    },
    data: items.map((item) => ({
      id: item.id,
      shopping_mall_order_id: item.shopping_mall_order_id,
      shopping_mall_order_seller_id: item.shopping_mall_order_seller_id,
      shopping_mall_sale_sku_id: item.shopping_mall_sale_sku_id,
      product_name: item.product_name,
      sku_code: item.sku_code,
      variant_attributes:
        item.variant_attributes === null ? undefined : item.variant_attributes,
      quantity: item.quantity,
      unit_price: item.unit_price,
      line_total: item.line_total,
      discount_amount: item.discount_amount,
      sku: {
        id: item.saleSku.id,
        sku_code: item.saleSku.sku_code,
        variant_combination: item.saleSku.variant_combination,
        base_price: item.saleSku.base_price,
        price: item.saleSku.sale_price ?? item.saleSku.base_price,
        enabled: item.saleSku.enabled,
        sale: {
          id: item.saleSku.sale.id,
          code: item.saleSku.sale.code,
          title: item.saleSku.sale.title,
          status: typia.assert<
            | "draft"
            | "pending_approval"
            | "published"
            | "suspended"
            | "archived"
          >(item.saleSku.sale.status),
          condition: typia.assert<"new" | "refurbished" | "used">(
            item.saleSku.sale.condition,
          ),
          brand:
            item.saleSku.sale.brand === null
              ? undefined
              : item.saleSku.sale.brand,
          short_description:
            item.saleSku.sale.short_description === null
              ? undefined
              : item.saleSku.sale.short_description,
          price: item.saleSku.sale_price ?? item.saleSku.base_price,
          thumbnail_url: undefined,
          return_policy_days: item.saleSku.sale.return_policy_days,
          warranty_info:
            item.saleSku.sale.warranty_info === null
              ? undefined
              : item.saleSku.sale.warranty_info,
          created_at: toISOStringSafe(item.saleSku.sale.created_at),
          updated_at: toISOStringSafe(item.saleSku.sale.updated_at),
          deleted_at: item.saleSku.sale.deleted_at
            ? toISOStringSafe(item.saleSku.sale.deleted_at)
            : null,
          seller: {
            id: item.saleSku.sale.seller.id,
            store_name: item.saleSku.sale.seller.store_name,
            email: item.saleSku.sale.seller.email,
            status: typia.assert<
              "pending" | "approved" | "rejected" | "suspended"
            >(item.saleSku.sale.seller.status),
            email_verified: item.saleSku.sale.seller.email_verified,
          },
          category: {
            id: item.saleSku.sale.category.id,
            name: item.saleSku.sale.category.name,
            slug: item.saleSku.sale.category.slug,
            description:
              item.saleSku.sale.category.description === null
                ? undefined
                : item.saleSku.sale.category.description,
            image_url:
              item.saleSku.sale.category.image_url === null
                ? undefined
                : item.saleSku.sale.category.image_url,
            parent_id:
              item.saleSku.sale.category.parent_id === null
                ? undefined
                : item.saleSku.sale.category.parent_id,
            status: item.saleSku.sale.category.status,
            display_order: item.saleSku.sale.category.display_order,
            product_count: item.saleSku.sale.category.product_count,
            created_at: toISOStringSafe(item.saleSku.sale.category.created_at),
            updated_at: toISOStringSafe(item.saleSku.sale.category.updated_at),
          },
        },
      },
      created_at: toISOStringSafe(item.created_at),
      updated_at: toISOStringSafe(item.updated_at),
      deleted_at: item.deleted_at ? toISOStringSafe(item.deleted_at) : null,
    })),
  };
}
