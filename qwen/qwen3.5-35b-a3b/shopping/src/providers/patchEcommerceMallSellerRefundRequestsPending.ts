import { IEcommerceMallAddress } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallAddress";
import { IEcommerceMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCustomer";
import { IEcommerceMallOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallOrder";
import { IEcommerceMallOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallOrderItem";
import { IEcommerceMallRefundRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallRefundRequest";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageIEcommerceMallRefundRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEcommerceMallRefundRequest";
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

export async function patchEcommerceMallSellerRefundRequestsPending(props: {
  seller: SellerPayload;
  body: IEcommerceMallRefundRequest.IRequest;
}): Promise<IPageIEcommerceMallRefundRequest.ISummary> {
  const page = props.body.page ?? 1;
  const limit = props.body.limit ?? 20;
  const skip = (page - 1) * limit;
  const whereInput: Prisma.ecommerce_mall_refund_requestsWhereInput = {
    status: "pending",
    deleted_at: null,
    orderItem: {
      productSnapshot: {
        seller_id: props.seller.id,
      },
    },
  };
  if (props.body.customerIds && props.body.customerIds.length > 0) {
    whereInput.customer = { id: { in: props.body.customerIds } };
  }
  if (props.body.orderItemId) {
    whereInput.orderItemId = props.body.orderItemId;
  }
  if (props.body.reasonKeywords) {
    whereInput.reason = {
      contains: props.body.reasonKeywords,
      mode: "insensitive",
    };
  }
  if (props.body.startDate) {
    whereInput.submitted_at = { gte: new Date(props.body.startDate) };
  }
  if (props.body.endDate) {
    whereInput.submitted_at = {
      gte: whereInput.submitted_at?.gte ?? null,
      lte: new Date(props.body.endDate),
    };
  }
  if (props.body.minAmount) {
    whereInput.orderItem = { unit_price: { gte: props.body.minAmount } };
  }
  if (props.body.maxAmount) {
    whereInput.orderItem = { unit_price: { lte: props.body.maxAmount } };
  }
  const sortBy = props.body.sortBy ?? "createdAt";
  const sortOrder = props.body.sortOrder ?? "desc";
  const orderByInput: Prisma.ecommerce_mall_refund_requestsOrderByWithRelationInput[] =
    sortBy === "status"
      ? [{ status: sortOrder }]
      : sortBy === "refundAmount"
        ? [{ orderItem: { unit_price: sortOrder } }]
        : sortBy === "updatedAt"
          ? [{ updated_at: sortOrder }]
          : [{ submitted_at: sortOrder }];
  const data = await MyGlobal.prisma.ecommerce_mall_refund_requests.findMany({
    where: whereInput,
    skip,
    take: limit,
    orderBy: orderByInput,
    include: {
      customer: {
        select: {
          id: true,
          email: true,
          status: true,
          created_at: true,
          deleted_at: true,
        },
      },
      orderItem: {
        select: {
          id: true,
          product_name: true,
          product_sku: true,
          variant_name: true,
          quantity: true,
          unit_price: true,
          total_price: true,
          status: true,
          created_at: true,
          updated_at: true,
          deleted_at: true,
          order: {
            select: {
              id: true,
              order_number: true,
              total_price: true,
              status: true,
              shippingAddress: {
                select: {
                  id: true,
                  recipient_name: true,
                  recipient_phone: true,
                  street: true,
                  city: true,
                  state: true,
                  postal_code: true,
                  country: true,
                  created_at: true,
                  deleted_at: true,
                },
              },
            },
          },
        },
      },
    },
  });
  const total = await MyGlobal.prisma.ecommerce_mall_refund_requests.count({
    where: whereInput,
  });
  const transformedData = await ArrayUtil.asyncMap(data, async (request) => {
    return {
      id: request.id,
      refund_code: request.refund_code,
      status: request.status,
      customer: {
        id: request.customer.id,
        email: request.customer.email,
        status: request.customer.status,
        created_at: toISOStringSafe(request.customer.created_at),
        deleted_at: request.customer.deleted_at
          ? toISOStringSafe(request.customer.deleted_at)
          : null,
      } satisfies IEcommerceMallCustomer.ISummary,
      orderItem: {
        id: request.orderItem.id,
        productName: request.orderItem.product_name,
        productSku: request.orderItem.product_sku,
        variantName: request.orderItem.variant_name,
        quantity: request.orderItem.quantity,
        unitPrice: request.orderItem.unit_price,
        totalPrice: request.orderItem.total_price,
        status: request.orderItem.status,
        order: {
          id: request.orderItem.order.id,
          order_number: request.orderItem.order.order_number,
          total_price: request.orderItem.order.total_price,
          status: request.orderItem.order.status,
          shipping_address: {
            id: request.orderItem.order.shippingAddress.id,
            recipient_name:
              request.orderItem.order.shippingAddress.recipient_name,
            recipient_phone:
              request.orderItem.order.shippingAddress.recipient_phone,
            street: request.orderItem.order.shippingAddress.street,
            city: request.orderItem.order.shippingAddress.city,
            state: request.orderItem.order.shippingAddress.state,
            postal_code: request.orderItem.order.shippingAddress.postal_code,
            country: request.orderItem.order.shippingAddress.country,
            created_at: toISOStringSafe(
              request.orderItem.order.shippingAddress.created_at,
            ),
            deleted_at: request.orderItem.order.shippingAddress.deleted_at
              ? toISOStringSafe(
                  request.orderItem.order.shippingAddress.deleted_at,
                )
              : null,
          } satisfies IEcommerceMallAddress.ISummary,
          created_at: toISOStringSafe(request.orderItem.order.created_at),
          deleted_at: request.orderItem.order.deleted_at
            ? toISOStringSafe(request.orderItem.order.deleted_at)
            : null,
        } satisfies IEcommerceMallOrder.ISummary,
        createdAt: toISOStringSafe(request.orderItem.created_at),
        updatedAt: toISOStringSafe(request.orderItem.updated_at),
        deletedAt: request.orderItem.deleted_at
          ? toISOStringSafe(request.orderItem.deleted_at)
          : null,
      } satisfies IEcommerceMallOrderItem.ISummary,
      delivery_date: request.delivery_date
        ? toISOStringSafe(request.delivery_date)
        : null,
      submitted_at: request.submitted_at
        ? toISOStringSafe(request.submitted_at)
        : null,
      decision_at: request.decision_at
        ? toISOStringSafe(request.decision_at)
        : null,
      processed_at: request.processed_at
        ? toISOStringSafe(request.processed_at)
        : null,
      created_at: toISOStringSafe(request.created_at),
      updated_at: toISOStringSafe(request.updated_at),
      deleted_at: request.deleted_at
        ? toISOStringSafe(request.deleted_at)
        : null,
    } satisfies IEcommerceMallRefundRequest.ISummary;
  });
  return {
    pagination: {
      current: page,
      limit: limit,
      records: total,
      pages: Math.ceil(total / limit),
    } satisfies IPage.IPagination,
    data: transformedData,
  } satisfies IPageIEcommerceMallRefundRequest.ISummary;
}
