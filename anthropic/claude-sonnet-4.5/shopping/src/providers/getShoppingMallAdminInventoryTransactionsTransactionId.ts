import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IShoppingMallInventoryTransaction } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallInventoryTransaction";
import { IShoppingMallSaleSku } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSaleSku";
import { IShoppingMallSale } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSale";
import { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
import { IShoppingMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCategory";
import { IShoppingMallOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrder";
import { AdminPayload } from "../decorators/payload/AdminPayload";

export async function getShoppingMallAdminInventoryTransactionsTransactionId(props: {
  admin: AdminPayload;
  transactionId: string & tags.Format<"uuid">;
}): Promise<IShoppingMallInventoryTransaction> {
  const transaction =
    await MyGlobal.prisma.shopping_mall_inventory_transactions.findUnique({
      where: { id: props.transactionId },
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
        order: true,
        seller: true,
      },
    });

  if (!transaction) {
    throw new HttpException("Inventory transaction not found", 404);
  }

  return {
    id: transaction.id as string & tags.Format<"uuid">,
    shopping_mall_sale_sku_id: transaction.shopping_mall_sale_sku_id as string &
      tags.Format<"uuid">,
    sku: transaction.sku
      ? {
          id: transaction.sku.id as string & tags.Format<"uuid">,
          sku_code: transaction.sku.sku_code,
          variant_combination: transaction.sku.variant_combination,
          base_price: transaction.sku.base_price,
          price: transaction.sku.sale_price ?? transaction.sku.base_price,
          enabled: transaction.sku.enabled,
          sale: {
            id: transaction.sku.sale.id as string & tags.Format<"uuid">,
            code: transaction.sku.sale.code,
            title: transaction.sku.sale.title,
            status: typia.assert<
              | "draft"
              | "pending_approval"
              | "published"
              | "suspended"
              | "archived"
            >(transaction.sku.sale.status),
            condition: typia.assert<"new" | "refurbished" | "used">(
              transaction.sku.sale.condition,
            ),
            brand: transaction.sku.sale.brand,
            short_description: transaction.sku.sale.short_description,
            price: transaction.sku.base_price,
            thumbnail_url: undefined,
            return_policy_days: transaction.sku.sale.return_policy_days,
            warranty_info: transaction.sku.sale.warranty_info,
            created_at: toISOStringSafe(transaction.sku.sale.created_at),
            updated_at: toISOStringSafe(transaction.sku.sale.updated_at),
            deleted_at: transaction.sku.sale.deleted_at
              ? toISOStringSafe(transaction.sku.sale.deleted_at)
              : null,
            seller: {
              id: transaction.sku.sale.seller.id as string &
                tags.Format<"uuid">,
              store_name: transaction.sku.sale.seller.store_name,
              email: transaction.sku.sale.seller.email as string &
                tags.Format<"email">,
              status: typia.assert<
                "pending" | "approved" | "rejected" | "suspended"
              >(transaction.sku.sale.seller.status),
              email_verified: transaction.sku.sale.seller.email_verified,
            },
            category: {
              id: transaction.sku.sale.category.id as string &
                tags.Format<"uuid">,
              name: transaction.sku.sale.category.name,
              slug: transaction.sku.sale.category.slug,
              description: transaction.sku.sale.category.description,
              image_url: transaction.sku.sale.category.image_url as
                | (string & tags.Format<"uri">)
                | null
                | undefined,
              parent_id: transaction.sku.sale.category.parent_id as
                | (string & tags.Format<"uuid">)
                | null
                | undefined,
              status: transaction.sku.sale.category.status,
              display_order: transaction.sku.sale.category.display_order,
              product_count: transaction.sku.sale.category.product_count,
              created_at: toISOStringSafe(
                transaction.sku.sale.category.created_at,
              ),
              updated_at: toISOStringSafe(
                transaction.sku.sale.category.updated_at,
              ),
            },
          },
        }
      : undefined,
    shopping_mall_order_id: transaction.shopping_mall_order_id as
      | (string & tags.Format<"uuid">)
      | null
      | undefined,
    order: transaction.order
      ? {
          id: transaction.order.id as string & tags.Format<"uuid">,
          order_number: transaction.order.order_number,
          status: transaction.order.status,
          subtotal: transaction.order.subtotal,
          shipping_total: transaction.order.shipping_total,
          tax_total: transaction.order.tax_total,
          discount_total: transaction.order.discount_total,
          total_amount: transaction.order.total_amount,
          estimated_delivery_start: transaction.order.estimated_delivery_start
            ? toISOStringSafe(transaction.order.estimated_delivery_start)
            : null,
          estimated_delivery_end: transaction.order.estimated_delivery_end
            ? toISOStringSafe(transaction.order.estimated_delivery_end)
            : null,
          actual_delivery_at: transaction.order.actual_delivery_at
            ? toISOStringSafe(transaction.order.actual_delivery_at)
            : null,
          cancelled_at: transaction.order.cancelled_at
            ? toISOStringSafe(transaction.order.cancelled_at)
            : null,
          completed_at: transaction.order.completed_at
            ? toISOStringSafe(transaction.order.completed_at)
            : null,
          created_at: toISOStringSafe(transaction.order.created_at),
          updated_at: toISOStringSafe(transaction.order.updated_at),
        }
      : null,
    shopping_mall_seller_id: transaction.shopping_mall_seller_id as
      | (string & tags.Format<"uuid">)
      | null
      | undefined,
    seller: transaction.seller
      ? {
          id: transaction.seller.id as string & tags.Format<"uuid">,
          store_name: transaction.seller.store_name,
          email: transaction.seller.email as string & tags.Format<"email">,
          status: typia.assert<
            "pending" | "approved" | "rejected" | "suspended"
          >(transaction.seller.status),
          email_verified: transaction.seller.email_verified,
        }
      : null,
    transaction_type: transaction.transaction_type,
    quantity_change: transaction.quantity_change,
    previous_quantity: transaction.previous_quantity,
    new_quantity: transaction.new_quantity,
    reason: transaction.reason,
    created_at: toISOStringSafe(transaction.created_at),
  };
}
