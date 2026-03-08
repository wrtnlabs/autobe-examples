import { IEcommerceMallOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallOrder";
import { IEcommerceMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSeller";
import { IEcommerceMallShipment } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallShipment";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageIEcommerceMallShipment } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEcommerceMallShipment";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { AdminPayload } from "../decorators/payload/AdminPayload";
import { EcommerceMallShipmentTransformer } from "../transformers/EcommerceMallShipmentTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchEcommerceMallAdminShipments(props: {
  admin: AdminPayload;
  body: IEcommerceMallShipment.IRequest;
}): Promise<IPageIEcommerceMallShipment.ISummary> {
  const limit = props.body.limit ?? 20;
  const pageParam = props.body.page;
  const page = pageParam ? parseInt(pageParam, 10) : 1;
  const skip = (page - 1) * limit;
  const whereInput: Prisma.ecommerce_mall_shipmentsWhereInput = {
    deleted_at: null,
    ...(props.body.trackingNumber !== undefined && {
      tracking_number: { contains: props.body.trackingNumber },
    }),
    ...(props.body.status !== undefined && {
      overall_status: props.body.status,
    }),
    ...(props.body.createdAfter !== undefined && {
      created_at: { gt: new Date(props.body.createdAfter) },
    }),
    ...(props.body.createdBefore !== undefined && {
      created_at: { lt: new Date(props.body.createdBefore) },
    }),
    ...(props.body.sellerId !== undefined && {
      seller_id: props.body.sellerId,
    }),
    ...(props.body.orderId !== undefined && {
      order_id: props.body.orderId,
    }),
  } satisfies Prisma.ecommerce_mall_shipmentsWhereInput;
  const orderByInput = (
    props.body.sortBy === "sellerId"
      ? [
          {
            seller_id:
              props.body.sortOrder === "asc" ? "asc" : ("desc" as const),
          },
        ]
      : props.body.sortBy === "trackingNumber"
        ? [
            {
              tracking_number:
                props.body.sortOrder === "asc" ? "asc" : ("desc" as const),
            },
          ]
        : [
            {
              created_at:
                props.body.sortOrder === "asc" ? "asc" : ("desc" as const),
            },
          ]
  ) satisfies Prisma.ecommerce_mall_shipmentsOrderByWithRelationInput[];
  const [data, total] = await Promise.all([
    MyGlobal.prisma.ecommerce_mall_shipments.findMany({
      where: whereInput,
      skip: skip,
      take: limit,
      orderBy: orderByInput,
      ...EcommerceMallShipmentTransformer.select(),
    }),
    MyGlobal.prisma.ecommerce_mall_shipments.count({ where: whereInput }),
  ]);
  return {
    data: data.map((item) => ({
      id: item.id,
      carrier_name: item.carrier_name,
      tracking_number: item.tracking_number,
      created_at: item.created_at.toISOString(),
      updated_at: item.updated_at.toISOString(),
      deleted_at: item.deleted_at?.toISOString() ?? null,
      order: {
        id: item.order.id,
        order_number: item.order.order_number,
        total_price: item.order.total_price,
        overall_status: typia.assert<
          | "paid"
          | "shipped"
          | "delivered"
          | "cancelled"
          | "refunded"
          | "partiallyCompleted"
        >(item.order.overall_status),
        created_at: item.order.created_at.toISOString(),
        updated_at: item.order.updated_at.toISOString(),
        deleted_at: item.order.deleted_at?.toISOString() ?? null,
      } satisfies IEcommerceMallOrder.ISummary,
      seller: {
        id: item.seller.id,
        email: item.seller.email,
        approval_status: typia.assert<"pending" | "approved" | "rejected">(
          item.seller.approval_status,
        ),
        rejection_reason: item.seller.rejection_reason,
        is_suspended: item.seller.is_suspended,
        is_banned: item.seller.is_banned,
        created_at: item.seller.created_at.toISOString(),
      } satisfies IEcommerceMallSeller.ISummary,
    })),
    pagination: {
      current: page,
      limit,
      records: total,
      pages: Math.ceil(total / limit),
    } satisfies IPage.IPagination,
  };
}
