import { IEcommerceMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCategory";
import { IEcommerceMallOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallOrder";
import { IEcommerceMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProduct";
import { IEcommerceMallProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductVariant";
import { IEcommerceMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSeller";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { AdminPayload } from "../decorators/payload/AdminPayload";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function getEcommerceMallAdminOrdersOrderIdItemsStatusHistory(props: {
  admin: AdminPayload;
  orderId: string & tags.Format<"uuid">;
}): Promise<IEcommerceMallOrder.IItemStatusHistory> {
  // Verify order exists and get items
  const orderItems = await MyGlobal.prisma.ecommerce_mall_order_items.findMany({
    where: {
      ecommerce_mall_order_id: props.orderId,
    },
    orderBy: {
      created_at: "asc",
    },
    select: {
      id: true,
      quantity: true,
      unit_price: true,
      item_status: true,
      created_at: true,
      updated_at: true,
      product: {
        select: {
          id: true,
          name: true,
          base_price: true,
          is_active: true,
          category: {
            select: {
              id: true,
              name: true,
              description: true,
              is_leaf: true,
              created_at: true,
              deleted_at: true,
            },
          },
          seller: {
            select: {
              id: true,
              email: true,
              approval_status: true,
              rejection_reason: true,
              is_suspended: true,
              is_banned: true,
              created_at: true,
              updated_at: true,
            },
          },
        },
      },
      productVariant: {
        select: {
          id: true,
          sku_code: true,
          option_values: true,
          price_override: true,
          stock_quantity: true,
          is_active: true,
        },
      },
    },
  });
  // Order must exist and have items
  if (orderItems.length === 0) {
    throw new HttpException("Order not found or has no items", 404);
  }
  // Transform the first order item with its status history
  const item = orderItems[0];
  // Query snapshot audits for this order item
  const snapshotAudits =
    await MyGlobal.prisma.ecommerce_mall_snapshot_audits.findMany({
      where: {
        record_type: "order_item",
        record_id: item.id,
      },
      orderBy: {
        changed_at: "asc",
      },
    });
  // Transform snapshot audits to status history entries
  const statusHistory: IEcommerceMallOrder.IStatusHistoryEntry[] =
    snapshotAudits.map((audit) => {
      const oldValues = JSON.parse(audit.old_values);
      const newValues = JSON.parse(audit.new_values);
      return {
        oldStatus: oldValues.item_status ?? null,
        newStatus: newValues.item_status,
        changedAt: toISOStringSafe(audit.changed_at),
        changedBy: audit.changed_by,
      };
    });
  // Build the response with proper type satisfaction
  const product = item.product;
  const productCategory = product.category;
  const productSeller = product.seller;
  const variant = item.productVariant;
  const statusMap: Record<
    string,
    "paid" | "shipped" | "delivered" | "cancelled" | "refunded"
  > = {
    paid: "paid",
    shipped: "shipped",
    delivered: "delivered",
    cancelled: "cancelled",
    refunded: "refunded",
  };
  return {
    id: item.id,
    product: {
      id: product.id,
      name: product.name,
      basePrice: product.base_price,
      category: {
        id: productCategory.id,
        name: productCategory.name,
        description: productCategory.description,
        parent: undefined,
        isLeaf: productCategory.is_leaf,
        createdAt: toISOStringSafe(productCategory.created_at),
        deletedAt: productCategory.deleted_at
          ? toISOStringSafe(productCategory.deleted_at)
          : null,
      } satisfies IEcommerceMallCategory.ISummary,
      seller: {
        id: productSeller.id,
        email: productSeller.email,
        approvalStatus: productSeller.approval_status as
          | "pending"
          | "approved"
          | "rejected",
        rejectionReason: productSeller.rejection_reason,
        isSuspended: productSeller.is_suspended,
        isBanned: productSeller.is_banned,
        createdAt: toISOStringSafe(productSeller.created_at),
        updatedAt: toISOStringSafe(productSeller.updated_at),
      } satisfies IEcommerceMallSeller.ISummary,
      isActive: product.is_active,
    } satisfies IEcommerceMallProduct.ISummary,
    variant: {
      id: variant.id,
      skuCode: variant.sku_code,
      optionValues: variant.option_values,
      priceOverride: variant.price_override,
      stockQuantity: variant.stock_quantity,
      isActive: variant.is_active,
      product: {
        id: product.id,
        name: product.name,
        basePrice: product.base_price,
        category: {
          id: productCategory.id,
          name: productCategory.name,
          description: "",
          parent: undefined,
          isLeaf: false,
          createdAt: "",
          deletedAt: null,
        } satisfies IEcommerceMallCategory.ISummary,
        seller: {
          id: productSeller.id,
          email: productSeller.email,
          approvalStatus: "pending" as const,
          rejectionReason: null,
          isSuspended: false,
          isBanned: false,
          createdAt: "",
          updatedAt: "",
        } satisfies IEcommerceMallSeller.ISummary,
        isActive: product.is_active,
      } satisfies IEcommerceMallProduct.ISummary,
    } satisfies IEcommerceMallProductVariant.ISummary,
    quantity: item.quantity,
    unitPrice: item.unit_price,
    itemStatus: statusMap[item.item_status] ?? "paid",
    statusHistory,
    createdAt: toISOStringSafe(item.created_at),
    updatedAt: toISOStringSafe(item.updated_at),
  } satisfies IEcommerceMallOrder.IItemStatusHistory;
}
