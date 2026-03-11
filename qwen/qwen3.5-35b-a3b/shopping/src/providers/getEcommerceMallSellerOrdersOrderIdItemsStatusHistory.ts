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
import { SellerPayload } from "../decorators/payload/SellerPayload";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function getEcommerceMallSellerOrdersOrderIdItemsStatusHistory(props: {
  seller: SellerPayload;
  orderId: string & tags.Format<"uuid">;
}): Promise<IEcommerceMallOrder.IItemStatusHistory[]> {
  const order = await MyGlobal.prisma.ecommerce_mall_orders.findFirst({
    where: {
      id: props.orderId,
      deleted_at: null,
    },
    select: { customer_id: true },
  });
  if (!order) {
    throw new HttpException("Order not found", 404);
  }
  const orderItems = await MyGlobal.prisma.ecommerce_mall_order_items.findMany({
    where: {
      ecommerce_mall_order_id: props.orderId,
      deleted_at: null,
      product: {
        seller_id: props.seller.id,
      },
    },
    include: {
      product: {
        include: {
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
        include: {
          product: {
            include: {
              category: {
                select: {
                  id: true,
                  name: true,
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
            select: {
              id: true,
              name: true,
              base_price: true,
              is_active: true,
            },
          },
        },
      },
    },
    orderBy: { created_at: "asc" },
  });
  const itemsWithHistory: IEcommerceMallOrder.IItemStatusHistory[] =
    await ArrayUtil.asyncMap(orderItems, async (item) => {
      const audits =
        await MyGlobal.prisma.ecommerce_mall_snapshot_audits.findMany({
          where: {
            record_type: "order_item",
            record_id: item.id,
          },
          orderBy: { changed_at: "asc" },
        });
      const statusHistory: IEcommerceMallOrder.IStatusHistoryEntry[] =
        audits.map((audit) => {
          const oldValues = JSON.parse(audit.old_values);
          const newValues = JSON.parse(audit.new_values);
          return {
            oldStatus: oldValues?.item_status ?? null,
            newStatus: newValues?.item_status,
            changedAt: toISOStringSafe(audit.changed_at),
            changedBy: audit.changed_by,
          } as IEcommerceMallOrder.IStatusHistoryEntry;
        });
      return {
        id: item.id,
        product: {
          id: item.product.id,
          name: item.product.name,
          basePrice: item.product.base_price,
          category: {
            id: item.product.category.id,
            name: item.product.category.name,
            description: item.product.category.description,
            isLeaf: item.product.category.is_leaf,
            createdAt: toISOStringSafe(item.product.category.created_at),
            deletedAt: item.product.category.deleted_at
              ? toISOStringSafe(item.product.category.deleted_at)
              : null,
          },
          seller: {
            id: item.product.seller.id,
            email: item.product.seller.email,
            approvalStatus: typia.assert<"pending" | "approved" | "rejected">(
              item.product.seller.approval_status,
            ),
            rejectionReason: item.product.seller.rejection_reason,
            isSuspended: item.product.seller.is_suspended,
            isBanned: item.product.seller.is_banned,
            createdAt: toISOStringSafe(item.product.seller.created_at),
            updatedAt: toISOStringSafe(item.product.seller.updated_at),
          },
          isActive: item.product.is_active,
        },
        variant: {
          id: item.productVariant.id,
          skuCode: item.productVariant.sku_code,
          optionValues: item.productVariant.option_values,
          priceOverride: item.productVariant.price_override,
          stockQuantity: item.productVariant.stock_quantity,
          isActive: item.productVariant.is_active,
          product: {
            id: item.productVariant.product.id,
            name: item.productVariant.product.name,
            basePrice: item.productVariant.product.base_price,
            category: {
              id: item.productVariant.product.category.id,
              name: item.productVariant.product.category.name,
              isLeaf: item.productVariant.product.category.is_leaf,
              createdAt: toISOStringSafe(
                item.productVariant.product.category.created_at,
              ),
              deletedAt: item.productVariant.product.category.deleted_at
                ? toISOStringSafe(
                    item.productVariant.product.category.deleted_at,
                  )
                : null,
            },
            seller: {
              id: item.productVariant.product.seller.id,
              email: item.productVariant.product.seller.email,
              approvalStatus: typia.assert<"pending" | "approved" | "rejected">(
                item.productVariant.product.seller.approval_status,
              ),
              rejectionReason:
                item.productVariant.product.seller.rejection_reason,
              isSuspended: item.productVariant.product.seller.is_suspended,
              isBanned: item.productVariant.product.seller.is_banned,
              createdAt: toISOStringSafe(
                item.productVariant.product.seller.created_at,
              ),
              updatedAt: toISOStringSafe(
                item.productVariant.product.seller.updated_at,
              ),
            },
            isActive: item.productVariant.product.is_active,
          },
        },
        quantity: item.quantity,
        unitPrice: item.unit_price,
        itemStatus: item.item_status,
        statusHistory,
        createdAt: toISOStringSafe(item.created_at),
        updatedAt: toISOStringSafe(item.updated_at),
      } as IEcommerceMallOrder.IItemStatusHistory;
    });
  return itemsWithHistory;
}
