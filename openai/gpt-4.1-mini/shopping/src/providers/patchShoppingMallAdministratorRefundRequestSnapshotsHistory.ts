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

export async function patchShoppingMallAdministratorRefundRequestSnapshotsHistory(props: {
  administrator: AdministratorPayload;
  body: IShoppingMallRefundRequestSnapshot.IRequest;
}): Promise<IPageIShoppingMallRefundRequestSnapshot.ISummary> {
  const {
    refundRequestId,
    status,
    createdAtStart,
    createdAtEnd,
    updatedAtStart,
    updatedAtEnd,
    page = 1,
    limit = 10,
  } = props.body;
  const where = {
    ...(refundRequestId == null
      ? {}
      : { shopping_mall_refund_request_id: refundRequestId }),
    ...(status == null ? {} : { status }),
    ...(createdAtStart == null && createdAtEnd == null
      ? {}
      : {
          created_at: {
            ...(createdAtStart == null ? {} : { gte: createdAtStart }),
            ...(createdAtEnd == null ? {} : { lte: createdAtEnd }),
          },
        }),
    ...(updatedAtStart == null && updatedAtEnd == null
      ? {}
      : {
          updated_at: {
            ...(updatedAtStart == null ? {} : { gte: updatedAtStart }),
            ...(updatedAtEnd == null ? {} : { lte: updatedAtEnd }),
          },
        }),
  };
  const skip = (page - 1) * limit;
  const total =
    await MyGlobal.prisma.shopping_mall_refund_request_snapshots.count({
      where,
    });
  const records =
    await MyGlobal.prisma.shopping_mall_refund_request_snapshots.findMany({
      where,
      orderBy: { created_at: "desc" },
      skip,
      take: limit,
      include: {
        refundRequest: {
          include: {
            orderItem: {
              include: {
                order: {
                  include: {
                    customer: true,
                  },
                },
                productVariant: true,
              },
            },
            customer: true,
            seller: true,
          },
        },
      },
    });
  const data = records.map((record) => ({
    id: record.id as string & tags.Format<"uuid">,
    status: record.status,
    reason: record.reason,
    comment: record.comment === null ? undefined : record.comment,
    createdAt: toISOStringSafe(record.created_at) as string &
      tags.Format<"date-time">,
    updatedAt: toISOStringSafe(record.updated_at) as string &
      tags.Format<"date-time">,
    deletedAt: record.deleted_at ? toISOStringSafe(record.deleted_at) : null,
    refundRequest: {
      id: record.refundRequest.id as string & tags.Format<"uuid">,
      requestReason: record.refundRequest.request_reason,
      status: record.refundRequest.status,
      sellerResponseReason: record.refundRequest.seller_response_reason ?? null,
      requestedAt: toISOStringSafe(
        record.refundRequest.requested_at,
      ) as string & tags.Format<"date-time">,
      respondedAt: record.refundRequest.responded_at
        ? toISOStringSafe(record.refundRequest.responded_at)
        : null,
      createdAt: toISOStringSafe(record.refundRequest.created_at) as string &
        tags.Format<"date-time">,
      updatedAt: toISOStringSafe(record.refundRequest.updated_at) as string &
        tags.Format<"date-time">,
      orderItem: record.refundRequest.orderItem
        ? {
            id: record.refundRequest.orderItem.id as string &
              tags.Format<"uuid">,
            orderId: record.refundRequest.orderItem
              .shopping_mall_order_id as string & tags.Format<"uuid">,
            productVariantId: record.refundRequest.orderItem
              .shopping_mall_product_variant_id as string & tags.Format<"uuid">,
            quantity: record.refundRequest.orderItem.quantity,
            createdAt: toISOStringSafe(
              record.refundRequest.orderItem.created_at,
            ) as string & tags.Format<"date-time">,
            updatedAt: toISOStringSafe(
              record.refundRequest.orderItem.updated_at,
            ) as string & tags.Format<"date-time">,
            order: record.refundRequest.orderItem.order
              ? {
                  id: record.refundRequest.orderItem.order.id as string &
                    tags.Format<"uuid">,
                  customerId: record.refundRequest.orderItem.order
                    .shopping_mall_customer_id as string & tags.Format<"uuid">,
                  sellerId: record.refundRequest.orderItem.order
                    .shopping_mall_customer_id as string & tags.Format<"uuid">, // removed incorrect seller id mapping
                  orderNumber:
                    record.refundRequest.orderItem.order.order_number,
                  status: record.refundRequest.orderItem.order.order_status,
                  customer: record.refundRequest.orderItem.order.customer
                    ? {
                        id: record.refundRequest.orderItem.order.customer
                          .id as string & tags.Format<"uuid">,
                        displayName:
                          record.refundRequest.orderItem.order.customer
                            .display_name ?? undefined,
                        createdAt: toISOStringSafe(
                          record.refundRequest.orderItem.order.customer
                            .created_at,
                        ) as string & tags.Format<"date-time">,
                        updatedAt: toISOStringSafe(
                          record.refundRequest.orderItem.order.customer
                            .updated_at,
                        ) as string & tags.Format<"date-time">,
                      }
                    : null,
                  seller: null,
                }
              : null,
          }
        : null,
      customer: record.refundRequest.customer
        ? {
            id: record.refundRequest.customer.id as string &
              tags.Format<"uuid">,
            displayName:
              record.refundRequest.customer.display_name ?? undefined,
            createdAt: toISOStringSafe(
              record.refundRequest.customer.created_at,
            ) as string & tags.Format<"date-time">,
            updatedAt: toISOStringSafe(
              record.refundRequest.customer.updated_at,
            ) as string & tags.Format<"date-time">,
          }
        : null,
      seller: record.refundRequest.seller
        ? {
            id: record.refundRequest.seller.id as string & tags.Format<"uuid">,
            shopName: record.refundRequest.seller.shop_name ?? undefined,
            createdAt: toISOStringSafe(
              record.refundRequest.seller.created_at,
            ) as string & tags.Format<"date-time">,
            updatedAt: toISOStringSafe(
              record.refundRequest.seller.updated_at,
            ) as string & tags.Format<"date-time">,
          }
        : null,
    },
  }));
  return {
    pagination: {
      current: page,
      limit,
      records: total,
      pages: Math.ceil(total / limit),
    },
    data,
  };
}
