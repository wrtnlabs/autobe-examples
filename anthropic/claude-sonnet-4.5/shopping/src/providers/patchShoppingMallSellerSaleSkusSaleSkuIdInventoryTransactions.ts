import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IShoppingMallInventoryTransaction } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallInventoryTransaction";
import { IPageIShoppingMallInventoryTransaction } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallInventoryTransaction";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IShoppingMallSaleSku } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSaleSku";
import { IShoppingMallSale } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSale";
import { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
import { IShoppingMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCategory";
import { IShoppingMallOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrder";
import { SellerPayload } from "../decorators/payload/SellerPayload";

export async function patchShoppingMallSellerSaleSkusSaleSkuIdInventoryTransactions(props: {
  seller: SellerPayload;
  saleSkuId: string & tags.Format<"uuid">;
  body: IShoppingMallInventoryTransaction.IRequest;
}): Promise<IPageIShoppingMallInventoryTransaction> {
  const sku = await MyGlobal.prisma.shopping_mall_sale_skus.findUnique({
    where: { id: props.saleSkuId },
  });

  if (!sku) {
    throw new HttpException("SKU not found", 404);
  }

  const sale = await MyGlobal.prisma.shopping_mall_sales.findUnique({
    where: { id: sku.shopping_mall_sale_id },
  });

  if (!sale || sale.shopping_mall_seller_id !== props.seller.id) {
    throw new HttpException("Forbidden", 403);
  }

  const page = props.body.page ?? 1;
  const limit = props.body.limit ?? 100;
  const skip = (page - 1) * limit;

  const sortBy = props.body.sort_by ?? "created_at";
  const sortOrder = props.body.sort_order ?? "desc";

  const [transactions, total] = await Promise.all([
    MyGlobal.prisma.shopping_mall_inventory_transactions.findMany({
      where: {
        shopping_mall_sale_sku_id: props.saleSkuId,
        ...(props.body.transaction_type && {
          transaction_type: props.body.transaction_type,
        }),
        ...(props.body.from_date || props.body.to_date
          ? {
              created_at: {
                ...(props.body.from_date && { gte: props.body.from_date }),
                ...(props.body.to_date && { lte: props.body.to_date }),
              },
            }
          : {}),
      },
      skip,
      take: limit,
      orderBy: { [sortBy]: sortOrder },
    }),
    MyGlobal.prisma.shopping_mall_inventory_transactions.count({
      where: {
        shopping_mall_sale_sku_id: props.saleSkuId,
        ...(props.body.transaction_type && {
          transaction_type: props.body.transaction_type,
        }),
        ...(props.body.from_date || props.body.to_date
          ? {
              created_at: {
                ...(props.body.from_date && { gte: props.body.from_date }),
                ...(props.body.to_date && { lte: props.body.to_date }),
              },
            }
          : {}),
      },
    }),
  ]);

  const data: IShoppingMallInventoryTransaction[] = await Promise.all(
    transactions.map(async (tx) => {
      const skuData = await MyGlobal.prisma.shopping_mall_sale_skus.findUnique({
        where: { id: tx.shopping_mall_sale_sku_id },
      });

      let skuInfo: IShoppingMallSaleSku.ISummary | undefined = undefined;

      if (skuData) {
        const saleData = await MyGlobal.prisma.shopping_mall_sales.findUnique({
          where: { id: skuData.shopping_mall_sale_id },
        });

        if (saleData) {
          const [sellerData, categoryData] = await Promise.all([
            MyGlobal.prisma.shopping_mall_sellers.findUnique({
              where: { id: saleData.shopping_mall_seller_id },
            }),
            MyGlobal.prisma.shopping_mall_categories.findUnique({
              where: { id: saleData.shopping_mall_category_id },
            }),
          ]);

          if (sellerData && categoryData) {
            skuInfo = {
              id: skuData.id,
              sku_code: skuData.sku_code,
              variant_combination: skuData.variant_combination,
              base_price: skuData.base_price,
              price: skuData.sale_price ?? skuData.base_price,
              enabled: skuData.enabled,
              sale: {
                id: saleData.id,
                code: saleData.code,
                title: saleData.title,
                status: typia.assert<
                  | "suspended"
                  | "draft"
                  | "pending_approval"
                  | "published"
                  | "archived"
                >(saleData.status),
                condition: typia.assert<"new" | "refurbished" | "used">(
                  saleData.condition,
                ),
                brand: saleData.brand ?? null,
                short_description: saleData.short_description ?? null,
                price: skuData.base_price,
                thumbnail_url: null,
                return_policy_days: saleData.return_policy_days,
                warranty_info: saleData.warranty_info ?? null,
                created_at: toISOStringSafe(saleData.created_at),
                updated_at: toISOStringSafe(saleData.updated_at),
                deleted_at: saleData.deleted_at
                  ? toISOStringSafe(saleData.deleted_at)
                  : null,
                seller: {
                  id: sellerData.id,
                  store_name: sellerData.store_name,
                  email: sellerData.email,
                  status: typia.assert<
                    "pending" | "approved" | "rejected" | "suspended"
                  >(sellerData.status),
                  email_verified: sellerData.email_verified,
                },
                category: {
                  id: categoryData.id,
                  name: categoryData.name,
                  slug: categoryData.slug,
                  description: categoryData.description ?? null,
                  image_url: categoryData.image_url ?? null,
                  parent_id: categoryData.parent_id ?? null,
                  status: categoryData.status,
                  display_order: categoryData.display_order,
                  product_count: categoryData.product_count,
                  created_at: toISOStringSafe(categoryData.created_at),
                  updated_at: toISOStringSafe(categoryData.updated_at),
                },
              },
            };
          }
        }
      }

      let orderInfo: IShoppingMallOrder.ISummary | null = null;

      if (tx.shopping_mall_order_id) {
        const orderData = await MyGlobal.prisma.shopping_mall_orders.findUnique(
          {
            where: { id: tx.shopping_mall_order_id },
          },
        );

        if (orderData) {
          orderInfo = {
            id: orderData.id,
            order_number: orderData.order_number,
            status: orderData.status,
            subtotal: orderData.subtotal,
            shipping_total: orderData.shipping_total,
            tax_total: orderData.tax_total,
            discount_total: orderData.discount_total,
            total_amount: orderData.total_amount,
            estimated_delivery_start: orderData.estimated_delivery_start
              ? toISOStringSafe(orderData.estimated_delivery_start)
              : null,
            estimated_delivery_end: orderData.estimated_delivery_end
              ? toISOStringSafe(orderData.estimated_delivery_end)
              : null,
            actual_delivery_at: orderData.actual_delivery_at
              ? toISOStringSafe(orderData.actual_delivery_at)
              : null,
            cancelled_at: orderData.cancelled_at
              ? toISOStringSafe(orderData.cancelled_at)
              : null,
            completed_at: orderData.completed_at
              ? toISOStringSafe(orderData.completed_at)
              : null,
            created_at: toISOStringSafe(orderData.created_at),
            updated_at: toISOStringSafe(orderData.updated_at),
          };
        }
      }

      let sellerInfo: IShoppingMallSeller.ISummary | null = null;

      if (tx.shopping_mall_seller_id) {
        const sellerData =
          await MyGlobal.prisma.shopping_mall_sellers.findUnique({
            where: { id: tx.shopping_mall_seller_id },
          });

        if (sellerData) {
          sellerInfo = {
            id: sellerData.id,
            store_name: sellerData.store_name,
            email: sellerData.email,
            status: typia.assert<
              "pending" | "approved" | "rejected" | "suspended"
            >(sellerData.status),
            email_verified: sellerData.email_verified,
          };
        }
      }

      return {
        id: tx.id,
        shopping_mall_sale_sku_id: tx.shopping_mall_sale_sku_id,
        sku: skuInfo,
        shopping_mall_order_id: tx.shopping_mall_order_id ?? null,
        order: orderInfo,
        shopping_mall_seller_id: tx.shopping_mall_seller_id ?? null,
        seller: sellerInfo,
        transaction_type: tx.transaction_type,
        quantity_change: tx.quantity_change,
        previous_quantity: tx.previous_quantity,
        new_quantity: tx.new_quantity,
        reason: tx.reason ?? null,
        created_at: toISOStringSafe(tx.created_at),
      };
    }),
  );

  return {
    pagination: {
      current: page,
      limit,
      records: total,
      pages: Math.ceil(total / limit),
    },
    data,
  };
}
