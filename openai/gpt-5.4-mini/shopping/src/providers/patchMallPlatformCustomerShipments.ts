import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IMallPlatformOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformOrder";
import { IMallPlatformSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformSeller";
import { IMallPlatformShipment } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformShipment";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageIMallPlatformShipment } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIMallPlatformShipment";
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

export async function patchMallPlatformCustomerShipments(props: {
  customer: CustomerPayload;
  body: IMallPlatformShipment.IRequest;
}): Promise<IPageIMallPlatformShipment.ISummary> {
  const page: number = props.body.page ?? 1;
  const limit: number = props.body.limit ?? 100;
  const skip: number = (page - 1) * limit;
  const where: Prisma.mall_platform_shipmentsWhereInput = {
    deleted_at: null,
    ...(props.body.orderId !== undefined && {
      mall_platform_order_id: props.body.orderId,
    }),
    ...(props.body.sellerId !== undefined && {
      mall_platform_seller_id: props.body.sellerId,
    }),
    ...(props.body.status !== undefined && { status: props.body.status }),
    ...(props.body.trackingNumber !== undefined && {
      tracking_number: {
        contains: props.body.trackingNumber,
        mode: "insensitive",
      },
    }),
    ...(props.body.search !== undefined && {
      OR: [
        {
          tracking_number: { contains: props.body.search, mode: "insensitive" },
        },
        { carrier_name: { contains: props.body.search, mode: "insensitive" } },
        {
          order: {
            order_number: { contains: props.body.search, mode: "insensitive" },
          },
        },
      ],
    }),
    ...(props.body.createdAtFrom !== undefined && {
      created_at: { gte: new Date(props.body.createdAtFrom) },
    }),
    ...(props.body.createdAtTo !== undefined && {
      created_at: { lte: new Date(props.body.createdAtTo) },
    }),
    ...(props.body.shippedAtFrom !== undefined && {
      shipped_at: { gte: new Date(props.body.shippedAtFrom) },
    }),
    ...(props.body.shippedAtTo !== undefined && {
      shipped_at: { lte: new Date(props.body.shippedAtTo) },
    }),
  };
  const rows = await MyGlobal.prisma.mall_platform_shipments.findMany({
    where,
    skip,
    take: limit,
    orderBy:
      props.body.sort === "createdAtAsc"
        ? { created_at: "asc" }
        : props.body.sort === "createdAtDesc"
          ? { created_at: "desc" }
          : props.body.sort === "shippedAtAsc"
            ? { shipped_at: "asc" }
            : props.body.sort === "shippedAtDesc"
              ? { shipped_at: "desc" }
              : { created_at: "desc" },
    select: {
      id: true,
      carrier_name: true,
      tracking_number: true,
      tracking_url: true,
      status: true,
      shipped_at: true,
      delivered_at: true,
      created_at: true,
      updated_at: true,
      deleted_at: true,
      seller: {
        select: {
          id: true,
          email: true,
          status: true,
          rejection_reason: true,
          created_at: true,
          updated_at: true,
          deleted_at: true,
        },
      },
      order: {
        select: {
          id: true,
          order_number: true,
          status: true,
          total_amount: true,
          created_at: true,
        },
      },
    },
  });
  const total: number = await MyGlobal.prisma.mall_platform_shipments.count({
    where,
  });
  return {
    data: await ArrayUtil.asyncMap(rows, async (row) => ({
      id: row.id,
      seller: {
        id: row.seller.id,
        email: row.seller.email,
        status: row.seller.status,
        rejectionReason: row.seller.rejection_reason,
        createdAt: toISOStringSafe(row.seller.created_at),
        updatedAt: toISOStringSafe(row.seller.updated_at),
        deletedAt: row.seller.deleted_at
          ? toISOStringSafe(row.seller.deleted_at)
          : null,
      },
      order: {
        id: row.order.id,
        orderNumber: row.order.order_number,
        status: row.order.status,
        totalAmount: row.order.total_amount,
        createdAt: toISOStringSafe(row.order.created_at),
      },
      carrierName: row.carrier_name,
      trackingNumber: row.tracking_number,
      trackingUrl: row.tracking_url,
      status: row.status,
      shippedAt: row.shipped_at ? toISOStringSafe(row.shipped_at) : null,
      deliveredAt: row.delivered_at ? toISOStringSafe(row.delivered_at) : null,
      createdAt: toISOStringSafe(row.created_at),
      updatedAt: toISOStringSafe(row.updated_at),
      deletedAt: row.deleted_at ? toISOStringSafe(row.deleted_at) : null,
    })),
    pagination: {
      current: page,
      limit,
      records: total,
      pages: Math.ceil(total / limit),
    },
  };
}
