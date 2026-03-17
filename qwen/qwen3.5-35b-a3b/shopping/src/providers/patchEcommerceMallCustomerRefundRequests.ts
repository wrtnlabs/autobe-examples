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
import { CustomerPayload } from "../decorators/payload/CustomerPayload";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchEcommerceMallCustomerRefundRequests(props: {
  customer: CustomerPayload;
  body: IEcommerceMallRefundRequest.IRequest;
}): Promise<IPageIEcommerceMallRefundRequest.ISummary> {
  const page = props.body.page ?? 1;
  const limit = props.body.limit ?? 20;
  const skip = (page - 1) * limit;
  const whereInput: Prisma.ecommerce_mall_refund_requestsWhereInput = {
    ecommerce_mall_customer_id: props.customer.id,
    deleted_at: null,
    ...(props.body.status !== undefined && { status: props.body.status }),
    ...(props.body.orderItemId !== undefined && {
      ecommerce_mall_order_item_id: props.body.orderItemId,
    }),
    ...(props.body.startDate !== undefined && {
      submitted_at: { gte: new Date(props.body.startDate) },
    }),
    ...(props.body.endDate !== undefined && {
      submitted_at: { lte: new Date(props.body.endDate) },
    }),
    ...(props.body.reasonKeywords !== undefined && {
      reason: {
        contains: props.body.reasonKeywords,
        mode: "insensitive" as const,
      },
    }),
    ...(props.body.minAmount !== undefined && {
      orderItem: { total_price: { gte: props.body.minAmount } },
    }),
    ...(props.body.maxAmount !== undefined && {
      orderItem: { total_price: { lte: props.body.maxAmount } },
    }),
  };
  const total = await MyGlobal.prisma.ecommerce_mall_refund_requests.count({
    where: whereInput,
  });
  const orderByInput: Prisma.ecommerce_mall_refund_requestsOrderByWithRelationInput =
    (() => {
      const sortBy = props.body.sortBy ?? "createdAt";
      const sortOrder = (props.body.sortOrder as "asc" | "desc") ?? "desc";
      if (sortBy === "status") {
        return { status: sortOrder };
      }
      if (sortBy === "createdAt") {
        return { submitted_at: sortOrder };
      }
      if (sortBy === "updatedAt") {
        return { updated_at: sortOrder };
      }
      return { submitted_at: sortOrder };
    })();
  const refunds = await MyGlobal.prisma.ecommerce_mall_refund_requests.findMany(
    {
      where: whereInput,
      orderBy: orderByInput,
      skip,
      take: limit,
      select: {
        id: true,
        refund_code: true,
        status: true,
        delivery_date: true,
        submitted_at: true,
        decision_at: true,
        processed_at: true,
        created_at: true,
        updated_at: true,
        deleted_at: true,
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
                    is_default: true,
                    created_at: true,
                    updated_at: true,
                    deleted_at: true,
                  },
                },
              },
            },
          },
        },
      },
    },
  );
  const data: IEcommerceMallRefundRequest.ISummary[] = await ArrayUtil.asyncMap(
    refunds,
    async (refund) => ({
      id: refund.id,
      refund_code: refund.refund_code,
      status: refund.status,
      customer: {
        id: refund.customer.id,
        email: refund.customer.email,
        status: refund.customer.status,
        created_at: toISOStringSafe(refund.customer.created_at),
        deleted_at: refund.customer.deleted_at
          ? toISOStringSafe(refund.customer.deleted_at)
          : null,
      },
      orderItem: {
        id: refund.orderItem.id,
        productName: refund.orderItem.product_name,
        productSku: refund.orderItem.product_sku,
        variantName: refund.orderItem.variant_name,
        quantity: refund.orderItem.quantity,
        unitPrice: refund.orderItem.unit_price,
        totalPrice: refund.orderItem.total_price,
        status: refund.orderItem.status,
        createdAt: toISOStringSafe(refund.orderItem.created_at),
        updatedAt: toISOStringSafe(refund.orderItem.updated_at),
        deletedAt: refund.orderItem.deleted_at
          ? toISOStringSafe(refund.orderItem.deleted_at)
          : null,
        order: {
          id: refund.orderItem.order.id,
          order_number: refund.orderItem.order.order_number,
          total_price: refund.orderItem.order.total_price,
          status: refund.orderItem.order.status,
          shipping_address: refund.orderItem.order.shippingAddress
            ? ({
                id: refund.orderItem.order.shippingAddress.id,
                recipient_name:
                  refund.orderItem.order.shippingAddress.recipient_name,
                recipient_phone:
                  refund.orderItem.order.shippingAddress.recipient_phone,
                street: refund.orderItem.order.shippingAddress.street,
                city: refund.orderItem.order.shippingAddress.city,
                state: refund.orderItem.order.shippingAddress.state,
                is_default: refund.orderItem.order.shippingAddress.is_default,
                created_at: toISOStringSafe(
                  refund.orderItem.order.shippingAddress.created_at,
                ),
                updated_at: toISOStringSafe(
                  refund.orderItem.order.shippingAddress.updated_at,
                ),
                deleted_at: refund.orderItem.order.shippingAddress.deleted_at
                  ? toISOStringSafe(
                      refund.orderItem.order.shippingAddress.deleted_at,
                    )
                  : null,
              } satisfies IEcommerceMallAddress.ISummary)
            : null,
          created_at: toISOStringSafe(refund.orderItem.order.created_at),
          deleted_at: refund.orderItem.order.deleted_at
            ? toISOStringSafe(refund.orderItem.order.deleted_at)
            : null,
        },
      },
      delivery_date: refund.delivery_date
        ? toISOStringSafe(refund.delivery_date)
        : null,
      submitted_at: refund.submitted_at
        ? toISOStringSafe(refund.submitted_at)
        : null,
      decision_at: refund.decision_at
        ? toISOStringSafe(refund.decision_at)
        : null,
      processed_at: refund.processed_at
        ? toISOStringSafe(refund.processed_at)
        : null,
      created_at: toISOStringSafe(refund.created_at),
      updated_at: toISOStringSafe(refund.updated_at),
      deleted_at: refund.deleted_at ? toISOStringSafe(refund.deleted_at) : null,
    }),
  );
  return {
    data,
    pagination: {
      current: page,
      limit,
      records: total,
      pages: Math.ceil(total / limit),
    },
  };
}
