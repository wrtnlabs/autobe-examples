import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageIShoppingMallRefundRequestSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallRefundRequestSnapshot";
import { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import { IShoppingMallOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrder";
import { IShoppingMallOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrderItem";
import { IShoppingMallProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductVariant";
import { IShoppingMallRefundRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallRefundRequest";
import { IShoppingMallRefundRequestSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallRefundRequestSnapshot";
import { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { AdministratorPayload } from "../decorators/payload/AdministratorPayload";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchShoppingMallAdministratorRefundRequestSnapshots(props: {
  administrator: AdministratorPayload;
  body: IShoppingMallRefundRequestSnapshot.IRequest;
}): Promise<IPageIShoppingMallRefundRequestSnapshot.ISummary> {
  const page =
    typeof props.body.page === "number" && props.body.page >= 1
      ? props.body.page
      : 1;
  const limit =
    typeof props.body.limit === "number" &&
    props.body.limit >= 1 &&
    props.body.limit <= 100
      ? props.body.limit
      : 100;
  const skip = (page - 1) * limit;
  const where: Prisma.shopping_mall_refund_request_snapshotsWhereInput = {
    deleted_at: null,
    ...(props.body.refundRequestId !== undefined &&
    props.body.refundRequestId !== null
      ? { shopping_mall_refund_request_id: props.body.refundRequestId }
      : {}),
    ...(props.body.status !== undefined && props.body.status !== null
      ? { status: props.body.status }
      : {}),
  };
  if (
    props.body.createdAtStart !== undefined &&
    props.body.createdAtStart !== null &&
    props.body.createdAtEnd !== undefined &&
    props.body.createdAtEnd !== null
  ) {
    where.created_at = {
      gte: props.body.createdAtStart,
      lte: props.body.createdAtEnd,
    };
  } else {
    if (
      props.body.createdAtStart !== undefined &&
      props.body.createdAtStart !== null
    )
      where.created_at = { gte: props.body.createdAtStart };
    if (
      props.body.createdAtEnd !== undefined &&
      props.body.createdAtEnd !== null
    )
      where.created_at = { lte: props.body.createdAtEnd };
  }
  if (
    props.body.updatedAtStart !== undefined &&
    props.body.updatedAtStart !== null &&
    props.body.updatedAtEnd !== undefined &&
    props.body.updatedAtEnd !== null
  ) {
    where.updated_at = {
      gte: props.body.updatedAtStart,
      lte: props.body.updatedAtEnd,
    };
  } else {
    if (
      props.body.updatedAtStart !== undefined &&
      props.body.updatedAtStart !== null
    )
      where.updated_at = { gte: props.body.updatedAtStart };
    if (
      props.body.updatedAtEnd !== undefined &&
      props.body.updatedAtEnd !== null
    )
      where.updated_at = { lte: props.body.updatedAtEnd };
  }
  const items =
    await MyGlobal.prisma.shopping_mall_refund_request_snapshots.findMany({
      where,
      skip,
      take: limit,
      orderBy: { created_at: "desc" },
      select: {
        id: true,
        status: true,
        reason: true,
        comment: true,
        created_at: true,
        updated_at: true,
        deleted_at: true,
        refundRequest: {
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
                productVariant: {
                  select: {
                    id: true,
                    sku_code: true,
                    stock_quantity: true,
                    created_at: true,
                    updated_at: true,
                  },
                },
                order: {
                  select: {
                    id: true,
                    order_number: true,
                    total_quantity: true,
                    order_status: true,
                    total_price: true,
                    customer: {
                      select: {
                        id: true,
                        email: true,
                        created_at: true,
                        updated_at: true,
                      },
                    },
                    created_at: true,
                    updated_at: true,
                  },
                },
              },
            },
            customer: {
              select: {
                id: true,
                email: true,
                created_at: true,
                updated_at: true,
              },
            },
            seller: {
              select: {
                id: true,
                email: true,
                shop_name: true,
                approval_status: true,
              },
            },
          },
        },
      },
    });
  const total =
    await MyGlobal.prisma.shopping_mall_refund_request_snapshots.count({
      where,
    });
  const data: IShoppingMallRefundRequestSnapshot.ISummary[] = items.map(
    (item) => {
      const refundRequest = item.refundRequest;
      const orderItem = refundRequest.orderItem;
      const order = orderItem.order;
      const variant = orderItem.productVariant;
      const customer = refundRequest.customer;
      const seller = refundRequest.seller;
      return {
        id: item.id,
        status: item.status,
        reason: item.reason,
        comment: item.comment ?? null,
        createdAt: toISOStringSafe(item.created_at) satisfies string &
          tags.Format<"date-time">,
        updatedAt: toISOStringSafe(item.updated_at) satisfies string &
          tags.Format<"date-time">,
        deletedAt: item.deleted_at
          ? (toISOStringSafe(item.deleted_at) satisfies string &
              tags.Format<"date-time">)
          : null,
        refundRequest: {
          id: refundRequest.id,
          requestReason: refundRequest.request_reason,
          status: refundRequest.status,
          sellerResponseReason: refundRequest.seller_response_reason ?? null,
          requestedAt: toISOStringSafe(
            refundRequest.requested_at,
          ) satisfies string & tags.Format<"date-time">,
          respondedAt: refundRequest.responded_at
            ? (toISOStringSafe(refundRequest.responded_at) satisfies string &
                tags.Format<"date-time">)
            : null,
          createdAt: toISOStringSafe(
            refundRequest.created_at,
          ) satisfies string & tags.Format<"date-time">,
          updatedAt: toISOStringSafe(
            refundRequest.updated_at,
          ) satisfies string & tags.Format<"date-time">,
          orderItem: {
            id: orderItem.id,
            quantity: orderItem.quantity,
            status: orderItem.status as
              | "paid"
              | "shipped"
              | "delivered"
              | "cancelled"
              | "refunded",
            createdAt: toISOStringSafe(orderItem.created_at) satisfies string &
              tags.Format<"date-time">,
            updatedAt: toISOStringSafe(orderItem.updated_at) satisfies string &
              tags.Format<"date-time">,
            productVariant: {
              id: variant.id,
              skuCode: variant.sku_code,
              stockQuantity: variant.stock_quantity,
              createdAt: toISOStringSafe(variant.created_at) satisfies string &
                tags.Format<"date-time">,
              updatedAt: toISOStringSafe(variant.updated_at) satisfies string &
                tags.Format<"date-time">,
            },
            order: {
              id: order.id,
              orderNumber: order.order_number,
              totalQuantity: order.total_quantity,
              orderStatus: order.order_status,
              totalPrice: order.total_price,
              customer: {
                id: order.customer.id,
                email: order.customer.email,
                createdAt: toISOStringSafe(
                  order.customer.created_at,
                ) satisfies string & tags.Format<"date-time">,
                updatedAt: toISOStringSafe(
                  order.customer.updated_at,
                ) satisfies string & tags.Format<"date-time">,
              },
              createdAt: toISOStringSafe(order.created_at) satisfies string &
                tags.Format<"date-time">,
              updatedAt: toISOStringSafe(order.updated_at) satisfies string &
                tags.Format<"date-time">,
            },
          },
          customer: {
            id: customer.id,
            email: customer.email,
            createdAt: toISOStringSafe(customer.created_at) satisfies string &
              tags.Format<"date-time">,
            updatedAt: toISOStringSafe(customer.updated_at) satisfies string &
              tags.Format<"date-time">,
          },
          seller: {
            id: seller.id,
            email: seller.email,
            shopName: seller.shop_name,
            approvalStatus: seller.approval_status,
          },
        },
      } satisfies IShoppingMallRefundRequestSnapshot.ISummary;
    },
  );
  return {
    pagination: {
      current: page,
      limit,
      records: total,
      pages: total === 0 ? 0 : Math.ceil(total / limit),
    },
    data,
  } satisfies IPageIShoppingMallRefundRequestSnapshot.ISummary;
}
