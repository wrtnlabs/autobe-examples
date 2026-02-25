import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageIShoppingMallOrderCancellationRequestLog } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallOrderCancellationRequestLog";
import { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import { IShoppingMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCategory";
import { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import { IShoppingMallOrderCancellationRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrderCancellationRequest";
import { IShoppingMallOrderCancellationRequestLog } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrderCancellationRequestLog";
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

export async function patchShoppingMallCustomerCancelRequestsRequestIdStatusLogs(props: {
  customer: CustomerPayload;
  requestId: string;
  body: IShoppingMallOrderCancellationRequestLog.IRequest;
}): Promise<IPageIShoppingMallOrderCancellationRequestLog> {
  const page = props.body.page ?? 1;
  const limit = props.body.limit ?? 20;
  const skip = (page - 1) * limit;
  const data =
    await MyGlobal.prisma.shopping_mall_order_cancellation_request_logs.findMany(
      {
        where: {
          shopping_mall_order_cancellation_request_id: props.requestId,
        },
        skip,
        take: limit,
        orderBy: {
          created_at: "desc",
        },
        include: {
          cancellationRequest: {
            include: {
              orderItem: {
                include: {
                  productSnapshot: true,
                  variantSnapshot: true,
                  sellerProfileSnapshot: true,
                },
              },
              customer: true,
            },
          },
          responder: true,
        },
      },
    );
  const total =
    await MyGlobal.prisma.shopping_mall_order_cancellation_request_logs.count({
      where: {
        shopping_mall_order_cancellation_request_id: props.requestId,
      },
    });
  return {
    data: data.map((log) => ({
      id: log.id as string & tags.Format<"uuid">,
      from_status: log.from_status,
      to_status: log.to_status,
      rejection_reason: log.rejection_reason,
      created_at: log.created_at.toISOString() as string &
        tags.Format<"date-time">,
      shopping_mall_order_cancellation_request_id:
        log.shopping_mall_order_cancellation_request_id as string &
          tags.Format<"uuid">,
      responded_by: log.responded_by,
      cancellationRequest: {
        id: log.cancellationRequest.id as string & tags.Format<"uuid">,
        order_item: {
          id: log.cancellationRequest.orderItem.id as string &
            tags.Format<"uuid">,
          quantity: log.cancellationRequest.orderItem.quantity,
          unit_price: log.cancellationRequest.orderItem.unit_price,
          total_price: log.cancellationRequest.orderItem.total_price,
          item_status: log.cancellationRequest.orderItem.item_status,
          original_product_name:
            log.cancellationRequest.orderItem.original_product_name,
          original_variant_options:
            log.cancellationRequest.orderItem.original_variant_options,
          created_at:
            log.cancellationRequest.orderItem.created_at.toISOString(),
          productSnapshot: {
            id: log.cancellationRequest.orderItem.productSnapshot.id as string &
              tags.Format<"uuid">,
            name: log.cancellationRequest.orderItem.productSnapshot.name,
            description:
              log.cancellationRequest.orderItem.productSnapshot.description,
            base_price:
              log.cancellationRequest.orderItem.productSnapshot.base_price,
            category: {
              id: log.cancellationRequest.orderItem.productSnapshot.category
                .id as string & tags.Format<"uuid">,
              name: log.cancellationRequest.orderItem.productSnapshot.category
                .name,
              description:
                log.cancellationRequest.orderItem.productSnapshot.category
                  .description,
              parent: null,
              subcategory_count: 0,
            },
            product: {
              id: log.cancellationRequest.orderItem.productSnapshot.product
                .id as string & tags.Format<"uuid">,
              name: log.cancellationRequest.orderItem.productSnapshot.product
                .name,
              base_price:
                log.cancellationRequest.orderItem.productSnapshot.product
                  .base_price,
              is_deleted:
                log.cancellationRequest.orderItem.productSnapshot.product
                  .is_deleted,
              seller: {
                id: log.cancellationRequest.orderItem.productSnapshot.product
                  .seller.id as string & tags.Format<"uuid">,
                shop_name:
                  log.cancellationRequest.orderItem.productSnapshot.product
                    .seller.shop_name,
                approval_status:
                  log.cancellationRequest.orderItem.productSnapshot.product
                    .seller.approval_status,
                created_at:
                  log.cancellationRequest.orderItem.productSnapshot.product.seller.created_at.toISOString(),
              },
              category: {
                id: log.cancellationRequest.orderItem.productSnapshot.product
                  .category.id as string & tags.Format<"uuid">,
                name: log.cancellationRequest.orderItem.productSnapshot.product
                  .category.name,
                description:
                  log.cancellationRequest.orderItem.productSnapshot.product
                    .category.description,
                parent: null,
                subcategory_count: 0,
              },
              average_rating: 0,
            },
          },
          variantSnapshot: {
            id: log.cancellationRequest.orderItem.variantSnapshot.id as string &
              tags.Format<"uuid">,
            product_snapshot_id: log.cancellationRequest.orderItem
              .variantSnapshot.product_snapshot_id as string &
              tags.Format<"uuid">,
            sku_code:
              log.cancellationRequest.orderItem.variantSnapshot.sku_code,
            variant_price_override:
              log.cancellationRequest.orderItem.variantSnapshot
                .variant_price_override,
            stock_quantity:
              log.cancellationRequest.orderItem.variantSnapshot.stock_quantity,
            is_in_stock:
              log.cancellationRequest.orderItem.variantSnapshot.is_in_stock,
          },
          sellerProfileSnapshot: {
            id: log.cancellationRequest.orderItem.sellerProfileSnapshot
              .id as string & tags.Format<"uuid">,
            shop_name:
              log.cancellationRequest.orderItem.sellerProfileSnapshot.shop_name,
            logo_image_url:
              log.cancellationRequest.orderItem.sellerProfileSnapshot
                .logo_image_url,
            approval_status:
              log.cancellationRequest.orderItem.sellerProfileSnapshot
                .approval_status,
          },
        },
        customer_id: log.cancellationRequest.customer_id as string &
          tags.Format<"uuid">,
        reason: log.cancellationRequest.reason,
        status: log.cancellationRequest.status as
          | "pending"
          | "approved"
          | "rejected",
        rejection_reason: log.cancellationRequest.rejection_reason,
        created_at: log.cancellationRequest.created_at.toISOString() as string &
          tags.Format<"date-time">,
        responded_at:
          log.cancellationRequest.responded_at === null
            ? null
            : log.cancellationRequest.responded_at.toISOString(),
        customer: {
          id: log.cancellationRequest.customer.id as string &
            tags.Format<"uuid">,
          email: log.cancellationRequest.customer.email,
          display_name: log.cancellationRequest.customer.display_name,
          phone_number: log.cancellationRequest.customer.phone_number,
          email_verified: log.cancellationRequest.customer.email_verified,
          created_at: log.cancellationRequest.customer.created_at.toISOString(),
          updated_at: log.cancellationRequest.customer.updated_at.toISOString(),
        },
      },
      responder: log.responder
        ? {
            id: log.responder.id as string & tags.Format<"uuid">,
            email: log.responder.email,
            deleted_at: log.responder.deleted_at,
            created_at: log.responder.created_at.toISOString(),
            updated_at: log.responder.updated_at.toISOString(),
            password_hash: log.responder.password_hash,
            role_grade: log.responder.role_grade,
          }
        : null,
    })),
    pagination: {
      current: page,
      limit: limit,
      records: total,
      pages: Math.ceil(total / limit),
    },
  };
}
