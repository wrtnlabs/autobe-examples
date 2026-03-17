import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageIShoppingMallCancellationRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallCancellationRequest";
import { IShoppingMallCancellationRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCancellationRequest";
import { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import { IShoppingMallOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrder";
import { IShoppingMallOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrderItem";
import { IShoppingMallProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductVariant";
import { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
import { IShoppingMallShipment } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallShipment";
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
  const page: number = props.body.page ?? 1;
  const limit: number = props.body.limit ?? 100;
  const skip: number = (page - 1) * limit;
  const where = {
    deleted_at: null,
    shopping_mall_customer_id: props.customer.id,
    ...(props.body.status !== undefined
      ? {
          status: props.body.status,
        }
      : {}),
    ...(props.body.reviewedByType !== undefined
      ? {
          reviewed_by_type: props.body.reviewedByType,
        }
      : {}),
    ...(props.body.shoppingMallOrderItemId !== undefined
      ? {
          shopping_mall_order_item_id: props.body.shoppingMallOrderItemId,
        }
      : {}),
    ...(props.body.reason !== undefined
      ? {
          reason: {
            contains: props.body.reason,
            mode: "insensitive",
          },
        }
      : {}),
    ...(props.body.decisionNote !== undefined
      ? {
          decision_note: {
            contains: props.body.decisionNote,
            mode: "insensitive",
          },
        }
      : {}),
    ...(props.body.createdAtFrom !== undefined ||
    props.body.createdAtTo !== undefined
      ? {
          created_at: {
            ...(props.body.createdAtFrom !== undefined
              ? {
                  gte: props.body.createdAtFrom,
                }
              : {}),
            ...(props.body.createdAtTo !== undefined
              ? {
                  lte: props.body.createdAtTo,
                }
              : {}),
          },
        }
      : {}),
    ...(props.body.reviewedAtFrom !== undefined ||
    props.body.reviewedAtTo !== undefined
      ? {
          reviewed_at: {
            ...(props.body.reviewedAtFrom !== undefined
              ? {
                  gte: props.body.reviewedAtFrom,
                }
              : {}),
            ...(props.body.reviewedAtTo !== undefined
              ? {
                  lte: props.body.reviewedAtTo,
                }
              : {}),
          },
        }
      : {}),
  } satisfies Prisma.shopping_mall_cancellation_requestsWhereInput;
  const orderBy: Prisma.shopping_mall_cancellation_requestsOrderByWithRelationInput[] =
    props.body.sort === "createdAt:asc"
      ? [{ created_at: "asc" }, { id: "asc" }]
      : props.body.sort === "createdAt:desc"
        ? [{ created_at: "desc" }, { id: "desc" }]
        : props.body.sort === "updatedAt:asc"
          ? [{ updated_at: "asc" }, { id: "asc" }]
          : props.body.sort === "updatedAt:desc"
            ? [{ updated_at: "desc" }, { id: "desc" }]
            : props.body.sort === "reviewedAt:asc"
              ? [{ reviewed_at: "asc" }, { id: "asc" }]
              : props.body.sort === "reviewedAt:desc"
                ? [{ reviewed_at: "desc" }, { id: "desc" }]
                : props.body.sort === "status:asc"
                  ? [{ status: "asc" }, { created_at: "desc" }, { id: "asc" }]
                  : props.body.sort === "status:desc"
                    ? [
                        { status: "desc" },
                        { created_at: "desc" },
                        { id: "desc" },
                      ]
                    : [{ created_at: "desc" }, { id: "desc" }];
  const data =
    await MyGlobal.prisma.shopping_mall_cancellation_requests.findMany({
      where,
      skip,
      take: limit,
      orderBy,
      include: {
        customer: true,
        orderItem: {
          include: {
            seller: true,
            productVariant: true,
            shipment: {
              include: {
                seller: true,
                order: true,
              },
            },
          },
        },
      },
    });
  const total = await MyGlobal.prisma.shopping_mall_cancellation_requests.count(
    {
      where,
    },
  );
  return {
    data: await ArrayUtil.asyncMap(data, async (item) => ({
      id: item.id,
      createdAt: toISOStringSafe(item.created_at),
      updatedAt: toISOStringSafe(item.updated_at),
      status: item.status,
      reason: item.reason,
      reviewedAt:
        item.reviewed_at !== null ? toISOStringSafe(item.reviewed_at) : null,
      reviewedByType: item.reviewed_by_type,
      decisionNote: item.decision_note,
      customer: {
        id: item.customer.id,
        email: item.customer.email,
        created_at: toISOStringSafe(item.customer.created_at),
        updated_at: toISOStringSafe(item.customer.updated_at),
        deleted_at:
          item.customer.deleted_at !== null
            ? toISOStringSafe(item.customer.deleted_at)
            : null,
        banned_at:
          item.customer.banned_at !== null
            ? toISOStringSafe(item.customer.banned_at)
            : null,
      },
      orderItem: {
        id: item.orderItem.id,
        created_at: toISOStringSafe(item.orderItem.created_at),
        updated_at: toISOStringSafe(item.orderItem.updated_at),
        deleted_at:
          item.orderItem.deleted_at !== null
            ? toISOStringSafe(item.orderItem.deleted_at)
            : null,
        unit_price: item.orderItem.unit_price,
        quantity: item.orderItem.quantity,
        status: item.orderItem.status,
        delivered_at:
          item.orderItem.delivered_at !== null
            ? toISOStringSafe(item.orderItem.delivered_at)
            : null,
        seller: {
          id: item.orderItem.seller.id,
          email: item.orderItem.seller.email,
          created_at: toISOStringSafe(item.orderItem.seller.created_at),
          updated_at: toISOStringSafe(item.orderItem.seller.updated_at),
          deleted_at:
            item.orderItem.seller.deleted_at !== null
              ? toISOStringSafe(item.orderItem.seller.deleted_at)
              : null,
          banned: item.orderItem.seller.banned,
          approval_status: item.orderItem.seller.approval_status,
          rejection_reason: item.orderItem.seller.rejection_reason,
          suspended: item.orderItem.seller.suspended,
        },
        productVariant: {
          id: item.orderItem.productVariant.id,
          created_at: toISOStringSafe(item.orderItem.productVariant.created_at),
          updated_at: toISOStringSafe(item.orderItem.productVariant.updated_at),
          deleted_at:
            item.orderItem.productVariant.deleted_at !== null
              ? toISOStringSafe(item.orderItem.productVariant.deleted_at)
              : null,
          price: item.orderItem.productVariant.price,
          sku_code: item.orderItem.productVariant.sku_code,
          option_summary: item.orderItem.productVariant.option_summary,
        },
        shipment:
          item.orderItem.shipment !== null
            ? {
                id: item.orderItem.shipment.id,
                created_at: toISOStringSafe(item.orderItem.shipment.created_at),
                updated_at: toISOStringSafe(item.orderItem.shipment.updated_at),
                deleted_at:
                  item.orderItem.shipment.deleted_at !== null
                    ? toISOStringSafe(item.orderItem.shipment.deleted_at)
                    : null,
                delivered_at:
                  item.orderItem.shipment.delivered_at !== null
                    ? toISOStringSafe(item.orderItem.shipment.delivered_at)
                    : null,
                shipped_at: toISOStringSafe(item.orderItem.shipment.shipped_at),
                auto_deliver_at: toISOStringSafe(
                  item.orderItem.shipment.auto_deliver_at,
                ),
                seller: {
                  id: item.orderItem.shipment.seller.id,
                  email: item.orderItem.shipment.seller.email,
                  created_at: toISOStringSafe(
                    item.orderItem.shipment.seller.created_at,
                  ),
                  updated_at: toISOStringSafe(
                    item.orderItem.shipment.seller.updated_at,
                  ),
                  deleted_at:
                    item.orderItem.shipment.seller.deleted_at !== null
                      ? toISOStringSafe(
                          item.orderItem.shipment.seller.deleted_at,
                        )
                      : null,
                  banned: item.orderItem.shipment.seller.banned,
                  approval_status:
                    item.orderItem.shipment.seller.approval_status,
                  rejection_reason:
                    item.orderItem.shipment.seller.rejection_reason,
                  suspended: item.orderItem.shipment.seller.suspended,
                },
                order: {
                  id: item.orderItem.shipment.order.id,
                  created_at: toISOStringSafe(
                    item.orderItem.shipment.order.created_at,
                  ),
                  updated_at: toISOStringSafe(
                    item.orderItem.shipment.order.updated_at,
                  ),
                  deleted_at:
                    item.orderItem.shipment.order.deleted_at !== null
                      ? toISOStringSafe(
                          item.orderItem.shipment.order.deleted_at,
                        )
                      : null,
                  status: item.orderItem.shipment.order.status,
                  code: item.orderItem.shipment.order.code,
                  total_price: item.orderItem.shipment.order.total_price,
                },
              }
            : null,
      },
    })),
    pagination: {
      current: page,
      limit,
      records: total,
      pages: Math.ceil(total / limit),
    } satisfies IPage.IPagination,
  };
}
