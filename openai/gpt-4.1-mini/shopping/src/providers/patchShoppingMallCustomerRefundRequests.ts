import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageIShoppingMallRefundRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallRefundRequest";
import { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import { IShoppingMallOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrder";
import { IShoppingMallOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrderItem";
import { IShoppingMallProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductVariant";
import { IShoppingMallRefundRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallRefundRequest";
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

export async function patchShoppingMallCustomerRefundRequests(props: {
  customer: CustomerPayload;
  body: IShoppingMallRefundRequest.IRequest;
}): Promise<IPageIShoppingMallRefundRequest.ISummary> {
  const page = props.body.page ?? 1;
  const limit = props.body.limit ?? 100;
  const skip = (page - 1) * limit;
  const where: Prisma.shopping_mall_refund_requestsWhereInput = {
    AND: [
      { shopping_mall_customer_id: props.customer.id },
      props.body.status ? { status: props.body.status } : {},
      props.body.shoppingMallSellerId
        ? { shopping_mall_seller_id: props.body.shoppingMallSellerId }
        : {},
      props.body.shoppingMallCustomerId
        ? { shopping_mall_customer_id: props.body.shoppingMallCustomerId }
        : {},
      props.body.requestedAtFrom
        ? { requested_at: { gte: props.body.requestedAtFrom } }
        : {},
      props.body.requestedAtTo
        ? { requested_at: { lte: props.body.requestedAtTo } }
        : {},
      props.body.respondedAtFrom
        ? { responded_at: { gte: props.body.respondedAtFrom } }
        : {},
      props.body.respondedAtTo
        ? { responded_at: { lte: props.body.respondedAtTo } }
        : {},
    ].filter(Boolean),
  };
  const refunds = await MyGlobal.prisma.shopping_mall_refund_requests.findMany({
    where,
    skip,
    take: limit,
    orderBy: { requested_at: "desc" },
    select: {
      id: true,
      request_reason: true,
      status: true,
      seller_response_reason: true,
      requested_at: true,
      responded_at: true,
      created_at: true,
      updated_at: true,
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
      seller: {
        select: {
          id: true,
          email: true,
          shop_name: true,
          shop_description: true,
          logo_uri: true,
          approval_status: true,
          rejection_reason: true,
        },
      },
    },
  });
  const data = refunds.map((record) => ({
    id: record.id,
    requestReason: record.request_reason,
    status: typia.assert<
      | "pending"
      | "approved"
      | "rejected"
      | "waiting"
      | "completed"
      | "cancelled"
      | "declined"
      | "shipped"
      | "delivered"
      | "paid"
      | "refunded"
      | "processing"
      | "cancelled_by_customer"
      | "cancelled_by_seller"
      | string
    >(record.status),
    sellerResponseReason: record.seller_response_reason ?? null,
    requestedAt:
      toISOStringSafe(record.requested_at) ??
      ("" as string & tags.Format<"date-time">),
    respondedAt: record.responded_at
      ? toISOStringSafe(record.responded_at)
      : null,
    createdAt:
      toISOStringSafe(record.created_at) ??
      ("" as string & tags.Format<"date-time">),
    updatedAt:
      toISOStringSafe(record.updated_at) ??
      ("" as string & tags.Format<"date-time">),
    orderItem: {
      id: record.orderItem.id,
      quantity: record.orderItem.quantity,
      status: typia.assert<
        "paid" | "shipped" | "delivered" | "cancelled" | "refunded"
      >(record.orderItem.status),
      createdAt:
        toISOStringSafe(record.orderItem.created_at) ??
        ("" as string & tags.Format<"date-time">),
      updatedAt:
        toISOStringSafe(record.orderItem.updated_at) ??
        ("" as string & tags.Format<"date-time">),
      deletedAt: record.orderItem.deleted_at
        ? toISOStringSafe(record.orderItem.deleted_at)
        : null,
      order: {
        id: record.orderItem.order.id,
        orderNumber: record.orderItem.order.order_number,
        totalPrice: record.orderItem.order.total_price,
        totalQuantity: record.orderItem.order.total_quantity,
        orderStatus: typia.assert<
          | "paid"
          | "shipped"
          | "delivered"
          | "cancelled"
          | "refunded"
          | "processing"
          | "cancelled_by_customer"
          | "cancelled_by_seller"
          | string
        >(record.orderItem.order.order_status),
        createdAt:
          toISOStringSafe(record.orderItem.order.created_at) ??
          ("" as string & tags.Format<"date-time">),
        updatedAt:
          toISOStringSafe(record.orderItem.order.updated_at) ??
          ("" as string & tags.Format<"date-time">),
        deletedAt: record.orderItem.order.deleted_at
          ? toISOStringSafe(record.orderItem.order.deleted_at)
          : null,
        customer: {
          id: record.orderItem.order.customer.id,
          email: record.orderItem.order.customer.email,
          displayName: record.orderItem.order.customer.display_name ?? null,
          phoneNumber: record.orderItem.order.customer.phone_number ?? null,
          createdAt:
            toISOStringSafe(record.orderItem.order.customer.created_at) ??
            ("" as string & tags.Format<"date-time">),
          updatedAt:
            toISOStringSafe(record.orderItem.order.customer.updated_at) ??
            ("" as string & tags.Format<"date-time">),
        } satisfies IShoppingMallCustomer.ISummary,
      },
      productVariant: {
        id: record.orderItem.productVariant.id,
        skuCode: record.orderItem.productVariant.sku_code,
        priceOverride: record.orderItem.productVariant.price_override ?? null,
        stockQuantity: record.orderItem.productVariant.stock_quantity,
        createdAt:
          toISOStringSafe(record.orderItem.productVariant.created_at) ??
          ("" as string & tags.Format<"date-time">),
        updatedAt:
          toISOStringSafe(record.orderItem.productVariant.updated_at) ??
          ("" as string & tags.Format<"date-time">),
        deletedAt: record.orderItem.productVariant.deleted_at
          ? toISOStringSafe(record.orderItem.productVariant.deleted_at)
          : null,
      },
    } satisfies IShoppingMallOrderItem.ISummary,
    customer: {
      id: record.customer.id,
      email: record.customer.email,
      displayName: record.customer.display_name ?? null,
      phoneNumber: record.customer.phone_number ?? null,
      createdAt:
        toISOStringSafe(record.customer.created_at) ??
        ("" as string & tags.Format<"date-time">),
      updatedAt:
        toISOStringSafe(record.customer.updated_at) ??
        ("" as string & tags.Format<"date-time">),
    } satisfies IShoppingMallCustomer.ISummary,
    seller: {
      id: record.seller.id,
      email: record.seller.email,
      shopName: record.seller.shop_name,
      shopDescription: record.seller.shop_description ?? null,
      logoUri: record.seller.logo_uri ?? null,
      approvalStatus: typia.assert<
        | "pending"
        | "approved"
        | "rejected"
        | "waiting"
        | "completed"
        | "cancelled"
        | "declined"
        | string
      >(record.seller.approval_status),
      rejectionReason: record.seller.rejection_reason ?? null,
    } satisfies IShoppingMallSeller.ISummary,
  }));
  return {
    pagination: {
      current: page,
      limit,
      records: await MyGlobal.prisma.shopping_mall_refund_requests.count({
        where,
      }),
      pages: Math.ceil(
        (await MyGlobal.prisma.shopping_mall_refund_requests.count({ where })) /
          limit,
      ),
    } satisfies IPage.IPagination,
    data,
  } satisfies IPageIShoppingMallRefundRequest.ISummary;
}
