import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IMallPlatformCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformCategory";
import { IMallPlatformOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformOrder";
import { IMallPlatformOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformOrderItem";
import { IMallPlatformProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformProduct";
import { IMallPlatformProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformProductVariant";
import { IMallPlatformSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformSeller";
import { IMallPlatformSellerAccount } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformSellerAccount";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageIMallPlatformOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIMallPlatformOrderItem";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { CustomerPayload } from "../decorators/payload/CustomerPayload";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchMallPlatformCustomerOrdersOrderIdItems(props: {
  customer: CustomerPayload;
  orderId: string & tags.Format<"uuid">;
  body: IMallPlatformOrderItem.IRequest;
}): Promise<IPageIMallPlatformOrderItem.ISummary> {
  const page: number = props.body.page ?? 1;
  const limit: number = props.body.limit ?? 20;
  const skip: number = (page - 1) * limit;
  const order = await MyGlobal.prisma.mall_platform_orders.findUniqueOrThrow({
    where: { id: props.orderId },
    select: {
      id: true,
      customer_id: true,
    },
  });
  if (order.customer_id !== props.customer.id) {
    throw new HttpException("Forbidden", 403);
  }
  const where: Prisma.mall_platform_order_itemsWhereInput = {
    mall_platform_order_id: props.orderId,
    ...(props.body.status !== undefined ? { status: props.body.status } : {}),
    ...(props.body.sellerId !== undefined
      ? { mall_platform_seller_id: props.body.sellerId }
      : {}),
    deleted_at: null,
  };
  const data = await MyGlobal.prisma.mall_platform_order_items.findMany({
    where,
    skip,
    take: limit,
    orderBy: { created_at: "desc" },
    select: {
      id: true,
      quantity: true,
      status: true,
      created_at: true,
      updated_at: true,
      deleted_at: true,
      order: {
        select: {
          id: true,
          order_number: true,
          status: true,
          total_amount: true,
          created_at: true,
        },
      },
      productVariant: {
        select: {
          id: true,
          sku_code: true,
          option_values: true,
          price_override: true,
          is_active: true,
          created_at: true,
          updated_at: true,
          deleted_at: true,
          product: {
            select: {
              id: true,
              name: true,
              description: true,
              base_price: true,
              created_at: true,
              updated_at: true,
              deleted_at: true,
              sellerAccount: {
                select: {
                  id: true,
                  email: true,
                  approval_status: true,
                  rejection_reason: true,
                  suspended_at: true,
                  deleted_at: true,
                  created_at: true,
                  updated_at: true,
                },
              },
              category: {
                select: {
                  id: true,
                  parentCategory: {
                    select: {
                      id: true,
                    },
                  },
                  name: true,
                  description: true,
                  created_at: true,
                  updated_at: true,
                  deleted_at: true,
                },
              },
            },
          },
        },
      },
      seller: {
        select: {
          id: true,
          email: true,
          status: true,
          rejection_reason: true,
          created_at: true,
          updated_at: true,
          deleted_at: true,
        },
      },
    },
  });
  const total: number = await MyGlobal.prisma.mall_platform_order_items.count({
    where,
  });
  return {
    data: data.map((item) => ({
      id: item.id,
      quantity: item.quantity,
      status: item.status,
      order: {
        id: item.order.id,
        orderNumber: item.order.order_number,
        status: item.order.status,
        totalAmount: item.order.total_amount,
        createdAt: toISOStringSafe(item.order.created_at),
      },
      productVariant: {
        id: item.productVariant.id,
        skuCode: item.productVariant.sku_code,
        optionValues: item.productVariant.option_values,
        priceOverride: item.productVariant.price_override,
        isActive: item.productVariant.is_active,
        product: {
          id: item.productVariant.product.id,
          name: item.productVariant.product.name,
          description: item.productVariant.product.description,
          basePrice: item.productVariant.product.base_price,
          sellerAccount: {
            id: item.productVariant.product.sellerAccount.id,
            email: item.productVariant.product.sellerAccount.email,
            approvalStatus:
              item.productVariant.product.sellerAccount.approval_status,
            rejectionReason:
              item.productVariant.product.sellerAccount.rejection_reason,
            suspendedAt:
              item.productVariant.product.sellerAccount.suspended_at === null
                ? null
                : toISOStringSafe(
                    item.productVariant.product.sellerAccount.suspended_at,
                  ),
            deletedAt:
              item.productVariant.product.sellerAccount.deleted_at === null
                ? null
                : toISOStringSafe(
                    item.productVariant.product.sellerAccount.deleted_at,
                  ),
            createdAt: toISOStringSafe(
              item.productVariant.product.sellerAccount.created_at,
            ),
            updatedAt: toISOStringSafe(
              item.productVariant.product.sellerAccount.updated_at,
            ),
          },
          category:
            item.productVariant.product.category === null
              ? null
              : {
                  id: item.productVariant.product.category.id,
                  parentCategory: null,
                  name: item.productVariant.product.category.name,
                  description: item.productVariant.product.category.description,
                  createdAt: toISOStringSafe(
                    item.productVariant.product.category.created_at,
                  ),
                  updatedAt: toISOStringSafe(
                    item.productVariant.product.category.updated_at,
                  ),
                  deletedAt:
                    item.productVariant.product.category.deleted_at === null
                      ? null
                      : toISOStringSafe(
                          item.productVariant.product.category.deleted_at,
                        ),
                },
          createdAt: toISOStringSafe(item.productVariant.product.created_at),
          updatedAt: toISOStringSafe(item.productVariant.product.updated_at),
          deletedAt:
            item.productVariant.product.deleted_at === null
              ? null
              : toISOStringSafe(item.productVariant.product.deleted_at),
        },
        createdAt: toISOStringSafe(item.productVariant.created_at),
        updatedAt: toISOStringSafe(item.productVariant.updated_at),
        deletedAt:
          item.productVariant.deleted_at === null
            ? null
            : toISOStringSafe(item.productVariant.deleted_at),
      },
      seller: {
        id: item.seller.id,
        email: item.seller.email,
        status: item.seller.status,
        rejectionReason: item.seller.rejection_reason,
        createdAt: toISOStringSafe(item.seller.created_at),
        updatedAt: toISOStringSafe(item.seller.updated_at),
        deletedAt:
          item.seller.deleted_at === null
            ? null
            : toISOStringSafe(item.seller.deleted_at),
      },
      created_at: toISOStringSafe(item.created_at),
      updated_at: toISOStringSafe(item.updated_at),
      deleted_at:
        item.deleted_at === null ? null : toISOStringSafe(item.deleted_at),
    })),
    pagination: {
      current: page,
      limit,
      records: total,
      pages: Math.ceil(total / limit),
    },
  };
}
