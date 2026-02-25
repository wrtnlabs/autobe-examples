import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageIShoppingMallOrderCancellationRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallOrderCancellationRequest";
import { IShoppingMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCategory";
import { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import { IShoppingMallOrderCancellationRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrderCancellationRequest";
import { IShoppingMallOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrderItem";
import { IShoppingMallOrderProductSnapshots } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrderProductSnapshots";
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
import { CustomerPayload } from "../decorators/payload/CustomerPayload";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchShoppingMallCustomerCancelRequests(props: {
  customer: CustomerPayload;
  body: IShoppingMallOrderCancellationRequest.IRequest;
}): Promise<IPageIShoppingMallOrderCancellationRequest.ISummary> {
  const page = props.body.page ?? 1;
  const limit = props.body.limit ?? 20;
  const skip = (page - 1) * limit;
  // Build WHERE conditions
  const whereConditions: Prisma.Shopping_mall_order_cancellation_requestsWhereInput =
    {
      deleted_at: null,
    };
  // Status filter
  if (props.body.status !== undefined) {
    whereConditions.status = props.body.status;
  }
  // Seller ID filter - via orderItem's order's seller relationship
  if (props.body.seller_id !== undefined) {
    whereConditions.orderItem = {
      shopping_mall_order: {
        shopping_mall_order_items: {
          some: {
            shopping_mall_order_seller_profile_snapshot: {
              shopping_mall_sellers: {
                id: props.body.seller_id as string & tags.Format<"uuid">,
              },
            },
          },
        },
      },
    };
  }
  // Order ID filter
  if (props.body.order_id !== undefined) {
    whereConditions.orderItem = {
      shopping_mall_order_id: props.body.order_id as string &
        tags.Format<"uuid">,
    };
  }
  // Customer ID filter
  if (props.body.customer_id !== undefined) {
    whereConditions.customer_id = props.body.customer_id as string &
      tags.Format<"uuid">;
  }
  // Date range filters
  if (props.body.created_at_gte !== undefined) {
    whereConditions.created_at = {
      ...whereConditions.created_at,
      gte: props.body.created_at_gte,
    };
  }
  if (props.body.created_at_lte !== undefined) {
    whereConditions.created_at = {
      ...whereConditions.created_at,
      lte: props.body.created_at_lte,
    };
  }
  // Search filter
  if (props.body.search !== undefined) {
    whereConditions.OR = [
      {
        orderItem: {
          shopping_mall_order: { id: { contains: props.body.search } },
        },
      },
      {
        orderItem: { original_product_name: { contains: props.body.search } },
      },
      {
        orderItem: {
          customer: { display_name: { contains: props.body.search } },
        },
      },
      { orderItem: { customer: { email: { contains: props.body.search } } } },
    ];
  }
  // Fetch data
  const [data, total] = await Promise.all([
    MyGlobal.prisma.shopping_mall_order_cancellation_requests.findMany({
      where: whereConditions,
      skip,
      take: limit,
      orderBy: { created_at: "desc" },
      include: {
        orderItem: {
          include: {
            shopping_mall_order: true,
            customer: true,
            shopping_mall_order_seller_profile_snapshot: true,
            shopping_mall_order_product_snapshot: true,
            shopping_mall_order_variant_snapshot: true,
          },
        },
        customer: true,
        seller: true,
      },
    }),
    MyGlobal.prisma.shopping_mall_order_cancellation_requests.count({
      where: whereConditions,
    }),
  ]);
  // Transform data to response format
  const transformedData: IShoppingMallOrderCancellationRequest.ISummary[] =
    data.map((request) => ({
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
        created_at: request.orderItem.created_at.toISOString() as string &
          tags.Format<"date-time">,
        productSnapshot: {
          id: request.orderItem.shopping_mall_order_product_snapshot
            .id as string & tags.Format<"uuid">,
          name: request.orderItem.shopping_mall_order_product_snapshot.name,
          description:
            request.orderItem.shopping_mall_order_product_snapshot.description,
          base_price:
            request.orderItem.shopping_mall_order_product_snapshot.base_price,
          category: request.orderItem.shopping_mall_order_product_snapshot
            .category
            ? {
                id: request.orderItem.shopping_mall_order_product_snapshot
                  .category.id as string & tags.Format<"uuid">,
                name: request.orderItem.shopping_mall_order_product_snapshot
                  .category.name,
                description:
                  request.orderItem.shopping_mall_order_product_snapshot
                    .category.description,
                parent: null,
                subcategory_count: 0,
              }
            : null,
          product: request.orderItem.shopping_mall_order_product_snapshot
            .product
            ? {
                id: request.orderItem.shopping_mall_order_product_snapshot
                  .product.id as string & tags.Format<"uuid">,
                name: request.orderItem.shopping_mall_order_product_snapshot
                  .product.name,
                base_price:
                  request.orderItem.shopping_mall_order_product_snapshot.product
                    .base_price,
                is_deleted:
                  request.orderItem.shopping_mall_order_product_snapshot.product
                    .is_deleted,
                seller: request.orderItem.shopping_mall_order_product_snapshot
                  .product.seller
                  ? {
                      id: request.orderItem.shopping_mall_order_product_snapshot
                        .product.seller.id as string & tags.Format<"uuid">,
                      shop_name:
                        request.orderItem.shopping_mall_order_product_snapshot
                          .product.seller.shop_name,
                      approval_status:
                        request.orderItem.shopping_mall_order_product_snapshot
                          .product.seller.approval_status,
                      created_at:
                        request.orderItem.shopping_mall_order_product_snapshot.product.seller.created_at.toISOString() as string &
                          tags.Format<"date-time">,
                    }
                  : null,
                category: request.orderItem.shopping_mall_order_product_snapshot
                  .product.category
                  ? {
                      id: request.orderItem.shopping_mall_order_product_snapshot
                        .product.category.id as string & tags.Format<"uuid">,
                      name: request.orderItem
                        .shopping_mall_order_product_snapshot.product.category
                        .name,
                      description:
                        request.orderItem.shopping_mall_order_product_snapshot
                          .product.category.description,
                      parent: null,
                      subcategory_count: 0,
                    }
                  : null,
                average_rating: 0,
              }
            : null,
        },
        variantSnapshot: {
          id: request.orderItem.shopping_mall_order_variant_snapshot
            .id as string & tags.Format<"uuid">,
          product_snapshot_id: request.orderItem
            .shopping_mall_order_variant_snapshot
            .shopping_mall_order_product_snapshot_id as string &
            tags.Format<"uuid">,
          sku_code:
            request.orderItem.shopping_mall_order_variant_snapshot.sku_code,
          variant_price_override:
            request.orderItem.shopping_mall_order_variant_snapshot
              .variant_price_override,
          stock_quantity:
            request.orderItem.shopping_mall_order_variant_snapshot
              .stock_quantity,
          is_in_stock:
            request.orderItem.shopping_mall_order_variant_snapshot.is_in_stock,
        },
        sellerProfileSnapshot: {
          id: request.orderItem.shopping_mall_order_seller_profile_snapshot
            .id as string & tags.Format<"uuid">,
          shop_name:
            request.orderItem.shopping_mall_order_seller_profile_snapshot
              .shop_name,
          logo_image_url:
            request.orderItem.shopping_mall_order_seller_profile_snapshot
              .logo_image_url,
          approval_status:
            request.orderItem.shopping_mall_order_seller_profile_snapshot
              .approval_status,
        },
      },
      customer: {
        id: request.customer.id as string & tags.Format<"uuid">,
        email: request.customer.email as string & tags.Format<"email">,
        display_name: request.customer.display_name,
        phone_number: request.customer.phone_number,
        email_verified: request.customer.email_verified,
        created_at: request.customer.created_at.toISOString() as string &
          tags.Format<"date-time">,
        updated_at: request.customer.updated_at.toISOString() as string &
          tags.Format<"date-time">,
      },
      reason: request.reason,
      status: request.status as "pending" | "approved" | "rejected",
      rejection_reason: request.rejection_reason,
      created_at: request.created_at.toISOString() as string &
        tags.Format<"date-time">,
      responded_at: request.responded_at
        ? (request.responded_at.toISOString() as string &
            tags.Format<"date-time">)
        : null,
    }));
  return {
    pagination: {
      current: page,
      limit: limit,
      records: total,
      pages: Math.ceil(total / limit),
    },
    data: transformedData,
  };
}
