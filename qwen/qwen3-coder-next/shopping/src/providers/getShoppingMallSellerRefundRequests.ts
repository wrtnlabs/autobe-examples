import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageIShoppingMallOrderRefundRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallOrderRefundRequest";
import { IShoppingMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCategory";
import { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import { IShoppingMallOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrderItem";
import { IShoppingMallOrderProductSnapshots } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrderProductSnapshots";
import { IShoppingMallOrderRefundRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrderRefundRequest";
import { IShoppingMallOrderSellerProfileSnapshots } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrderSellerProfileSnapshots";
import { IShoppingMallOrderVariantSnapshots } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrderVariantSnapshots";
import { IShoppingMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProduct";
import { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
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

export async function getShoppingMallSellerRefundRequests(props: {
  seller: SellerPayload;
}): Promise<IPageIShoppingMallOrderRefundRequest.ISummary> {
  const page = 1;
  const limit = 20;
  const skip = (page - 1) * limit;
  const whereCondition: Prisma.shopping_mall_order_refund_requestsWhereInput = {
    shopping_mall_seller_id: props.seller.id,
    deleted_at: null,
  };
  const [data, total] = await Promise.all([
    MyGlobal.prisma.shopping_mall_order_refund_requests.findMany({
      where: whereCondition,
      skip,
      take: limit,
      orderBy: { created_at: "desc" },
      include: {
        orderItem: {
          include: {
            order: {
              select: { id: true },
            },
            productSnapshot: {
              select: {
                id: true,
                shopping_mall_product_id: true,
                name: true,
                description: true,
                base_price: true,
                shopping_mall_category_id: true,
              },
            },
            variantSnapshot: {
              select: {
                id: true,
                product_snapshot_id: true,
                sku_code: true,
                variant_price_override: true,
                stock_quantity: true,
                is_in_stock: true,
              },
            },
            sellerProfileSnapshot: {
              select: {
                id: true,
                shop_name: true,
                logo_image_url: true,
                approval_status: true,
              },
            },
          },
        },
        customer: {
          select: {
            id: true,
            email: true,
            display_name: true,
            phone_number: true,
            email_verified: true,
            created_at: true,
            updated_at: true,
          },
        },
        seller: {
          select: {
            id: true,
            shop_name: true,
            approval_status: true,
            created_at: true,
          },
        },
      },
    }),
    MyGlobal.prisma.shopping_mall_order_refund_requests.count({
      where: whereCondition,
    }),
  ]);
  return {
    data: data.map((request) => ({
      id: request.id as string & tags.Format<"uuid">,
      orderItem: {
        id: request.orderItem.id as string & tags.Format<"uuid">,
        quantity: request.orderItem.quantity,
        unit_price: request.orderItem.unit_price,
        total_price: request.orderItem.total_price,
        item_status: request.orderItem.item_status as
          | "paid"
          | "shipped"
          | "delivered"
          | "cancelled"
          | "refunded",
        original_product_name: request.orderItem.original_product_name,
        original_variant_options: request.orderItem.original_variant_options,
        created_at: toISOStringSafe(request.orderItem.created_at),
        productSnapshot: {
          id: request.orderItem.productSnapshot.id as string &
            tags.Format<"uuid">,
          name: request.orderItem.productSnapshot.name,
          description: request.orderItem.productSnapshot.description,
          base_price: request.orderItem.productSnapshot.base_price,
          category: {
            id: request.orderItem.productSnapshot.shopping_mall_category_id
              ? (request.orderItem.productSnapshot
                  .shopping_mall_category_id as string & tags.Format<"uuid">)
              : ("00000000-0000-0000-0000-000000000000" as string &
                  tags.Format<"uuid">),
            name: "General",
            description: null,
            parent: null,
            subcategory_count: 0,
          } satisfies IShoppingMallCategory.ISummary,
          product: {
            id: request.orderItem.productSnapshot
              .shopping_mall_product_id as string & tags.Format<"uuid">,
            name: request.orderItem.productSnapshot.name,
            base_price: request.orderItem.productSnapshot.base_price,
            is_deleted: false,
            seller: {
              id: request.seller
                ? (request.seller.id as string & tags.Format<"uuid">)
                : (props.seller.id as string & tags.Format<"uuid">),
              shop_name: request.seller
                ? request.seller.shop_name
                : "Unknown Shop",
              approval_status: request.seller
                ? request.seller.approval_status
                : "approved",
              created_at: request.seller
                ? toISOStringSafe(request.seller.created_at)
                : toISOStringSafe(new Date()),
            } satisfies IShoppingMallSeller.ISummary,
            category: {
              id: request.orderItem.productSnapshot.shopping_mall_category_id
                ? (request.orderItem.productSnapshot
                    .shopping_mall_category_id as string & tags.Format<"uuid">)
                : ("00000000-0000-0000-0000-000000000000" as string &
                    tags.Format<"uuid">),
              name: "General",
              description: null,
              parent: null,
              subcategory_count: 0,
            } satisfies IShoppingMallCategory.ISummary,
            average_rating: 0,
          } satisfies IShoppingMallProduct.ISummary,
        } satisfies IShoppingMallOrderProductSnapshots.ISummary,
        variantSnapshot: {
          id: request.orderItem.variantSnapshot.id as string &
            tags.Format<"uuid">,
          product_snapshot_id: request.orderItem.variantSnapshot
            .product_snapshot_id as string & tags.Format<"uuid">,
          sku_code: request.orderItem.variantSnapshot.sku_code,
          variant_price_override:
            request.orderItem.variantSnapshot.variant_price_override ?? null,
          stock_quantity: request.orderItem.variantSnapshot.stock_quantity,
          is_in_stock: request.orderItem.variantSnapshot.is_in_stock,
        } satisfies IShoppingMallOrderVariantSnapshots.ISummary,
        sellerProfileSnapshot: {
          id: request.orderItem.sellerProfileSnapshot.id as string &
            tags.Format<"uuid">,
          shop_name: request.orderItem.sellerProfileSnapshot.shop_name,
          logo_image_url:
            request.orderItem.sellerProfileSnapshot.logo_image_url ?? null,
          approval_status:
            request.orderItem.sellerProfileSnapshot.approval_status,
        } satisfies IShoppingMallOrderSellerProfileSnapshots.ISummary,
      } satisfies IShoppingMallOrderItem.ISummary,
      customer: {
        id: request.customer.id as string & tags.Format<"uuid">,
        email: request.customer.email as string & tags.Format<"email">,
        display_name: request.customer.display_name ?? null,
        phone_number: request.customer.phone_number ?? null,
        email_verified: request.customer.email_verified,
        created_at: toISOStringSafe(request.customer.created_at),
        updated_at: toISOStringSafe(request.customer.updated_at),
      } satisfies IShoppingMallCustomer.ISummary,
      seller: request.seller
        ? ({
            id: request.seller.id as string & tags.Format<"uuid">,
            shop_name: request.seller.shop_name,
            approval_status: request.seller.approval_status,
            created_at: toISOStringSafe(request.seller.created_at),
          } satisfies IShoppingMallSeller.ISummary)
        : ({
            id: props.seller.id as string & tags.Format<"uuid">,
            shop_name: "Unknown Shop",
            approval_status: "approved",
            created_at: toISOStringSafe(new Date()),
          } satisfies IShoppingMallSeller.ISummary),
      createdAt: toISOStringSafe(request.created_at),
      updatedAt: toISOStringSafe(request.updated_at),
      reason: request.reason,
      status: request.status,
      rejectionReason: request.rejection_reason ?? null,
    })),
    pagination: {
      current: page,
      limit: limit,
      records: total,
      pages: Math.ceil(total / limit),
    } satisfies IPage.IPagination,
  } satisfies IPageIShoppingMallOrderRefundRequest.ISummary;
}
