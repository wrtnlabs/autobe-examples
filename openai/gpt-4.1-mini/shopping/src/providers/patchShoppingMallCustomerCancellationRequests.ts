import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageIShoppingMallCancellationRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallCancellationRequest";
import { IShoppingMallCancellationRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCancellationRequest";
import { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import { IShoppingMallOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrder";
import { IShoppingMallOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrderItem";
import { IShoppingMallProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductVariant";
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

export async function patchShoppingMallCustomerCancellationRequests(props: {
  customer: CustomerPayload;
  body: IShoppingMallCancellationRequest.IRequest;
}): Promise<IPageIShoppingMallCancellationRequest.ISummary> {
  const page = props.body.page ?? 1;
  const limit = props.body.limit ?? 20;
  if (page < 1) {
    throw new HttpException("Page must be at least 1", 400);
  }
  if (limit < 1 || limit > 100) {
    throw new HttpException("Limit must be between 1 and 100", 400);
  }
  const whereCondition: Prisma.shopping_mall_cancellation_requestsWhereInput = {
    shopping_mall_customer_id: props.customer.id,
    deleted_at: null,
  };
  if (props.body.shoppingMallCustomerId !== undefined) {
    whereCondition.shopping_mall_customer_id =
      props.body.shoppingMallCustomerId;
  }
  if (props.body.shoppingMallOrderItemId !== undefined) {
    whereCondition.shopping_mall_order_item_id =
      props.body.shoppingMallOrderItemId;
  }
  if (props.body.sellerApprovalStatus !== undefined) {
    whereCondition.seller_approval_status = props.body.sellerApprovalStatus;
  }
  if (props.body.reason !== undefined) {
    whereCondition.reason = {
      contains: props.body.reason,
      mode: "insensitive",
    };
  }
  if (
    props.body.requestedAtFrom !== undefined &&
    props.body.requestedAtTo !== undefined
  ) {
    whereCondition.requested_at = {
      gte: props.body.requestedAtFrom,
      lte: props.body.requestedAtTo,
    };
  } else if (props.body.requestedAtFrom !== undefined) {
    whereCondition.requested_at = { gte: props.body.requestedAtFrom };
  } else if (props.body.requestedAtTo !== undefined) {
    whereCondition.requested_at = { lte: props.body.requestedAtTo };
  }
  const data =
    await MyGlobal.prisma.shopping_mall_cancellation_requests.findMany({
      where: whereCondition,
      skip: (page - 1) * limit,
      take: limit,
      orderBy: { requested_at: "desc" },
      select: {
        id: true,
        reason: true,
        seller_approval_status: true,
        seller_approval_reason: true,
        requested_at: true,
        processed_at: true,
        created_at: true,
        updated_at: true,
        deleted_at: true,
        customer: {
          select: {
            id: true,
            email: true,
            display_name: true,
            phone_number: true,
            created_at: true,
            updated_at: true,
          },
        },
        orderItem: {
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
                total_price: true,
                total_quantity: true,
                order_status: true,
                created_at: true,
                updated_at: true,
                deleted_at: true,
                customer: {
                  select: {
                    id: true,
                    email: true,
                    display_name: true,
                    phone_number: true,
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
                price_override: true,
                stock_quantity: true,
                created_at: true,
                updated_at: true,
                deleted_at: true,
              },
            },
          },
        },
      },
    });
  const total = await MyGlobal.prisma.shopping_mall_cancellation_requests.count(
    { where: whereCondition },
  );
  return {
    pagination: {
      current: page,
      limit: limit,
      records: total,
      pages: total === 0 ? 0 : Math.ceil(total / limit),
    },
    data: data.map((record) => ({
      id: record.id,
      reason: record.reason,
      sellerApprovalStatus: record.seller_approval_status,
      sellerApprovalReason: record.seller_approval_reason ?? null,
      requestedAt: toISOStringSafe(record.requested_at),
      processedAt: record.processed_at
        ? toISOStringSafe(record.processed_at)
        : null,
      createdAt: toISOStringSafe(record.created_at),
      updatedAt: toISOStringSafe(record.updated_at),
      deletedAt: record.deleted_at ? toISOStringSafe(record.deleted_at) : null,
      customer: {
        id: record.customer.id,
        email: record.customer.email,
        displayName: record.customer.display_name ?? null,
        phoneNumber: record.customer.phone_number ?? null,
        createdAt: toISOStringSafe(record.customer.created_at),
        updatedAt: toISOStringSafe(record.customer.updated_at),
      },
      orderItem: {
        id: record.orderItem.id,
        quantity: record.orderItem.quantity,
        status: typia.assert<
          "paid" | "shipped" | "delivered" | "cancelled" | "refunded"
        >(record.orderItem.status),
        createdAt: toISOStringSafe(record.orderItem.created_at),
        updatedAt: toISOStringSafe(record.orderItem.updated_at),
        deletedAt: record.orderItem.deleted_at
          ? toISOStringSafe(record.orderItem.deleted_at)
          : null,
        order: {
          id: record.orderItem.order.id,
          orderNumber: record.orderItem.order.order_number,
          totalPrice: record.orderItem.order.total_price,
          totalQuantity: record.orderItem.order.total_quantity,
          orderStatus: typia.assert<
            "paid" | "shipped" | "delivered" | "cancelled" | "refunded"
          >(record.orderItem.order.order_status),
          createdAt: toISOStringSafe(record.orderItem.order.created_at),
          updatedAt: toISOStringSafe(record.orderItem.order.updated_at),
          deletedAt: record.orderItem.order.deleted_at
            ? toISOStringSafe(record.orderItem.order.deleted_at)
            : null,
          customer: {
            id: record.orderItem.order.customer.id,
            email: record.orderItem.order.customer.email,
            displayName: record.orderItem.order.customer.display_name ?? null,
            phoneNumber: record.orderItem.order.customer.phone_number ?? null,
            createdAt: toISOStringSafe(
              record.orderItem.order.customer.created_at,
            ),
            updatedAt: toISOStringSafe(
              record.orderItem.order.customer.updated_at,
            ),
          },
        },
        productVariant: {
          id: record.orderItem.productVariant.id,
          skuCode: record.orderItem.productVariant.sku_code,
          priceOverride: record.orderItem.productVariant.price_override ?? null,
          stockQuantity: record.orderItem.productVariant.stock_quantity,
          createdAt: toISOStringSafe(
            record.orderItem.productVariant.created_at,
          ),
          updatedAt: toISOStringSafe(
            record.orderItem.productVariant.updated_at,
          ),
          deletedAt: record.orderItem.productVariant.deleted_at
            ? toISOStringSafe(record.orderItem.productVariant.deleted_at)
            : null,
        },
      },
    })),
  };
}
