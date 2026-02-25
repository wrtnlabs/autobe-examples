import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageIShoppingMallShipmentTracking } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallShipmentTracking";
import { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
import { IShoppingMallShipment } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallShipment";
import { IShoppingMallShipmentTracking } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallShipmentTracking";
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

export async function patchShoppingMallSellerShipmentTrackings(props: {
  seller: SellerPayload;
  body: IShoppingMallShipmentTracking.IRequest;
}): Promise<IPageIShoppingMallShipmentTracking.ISummary> {
  const page = props.body.page ?? 1;
  const limit = props.body.limit ?? 10;
  const skip = (page - 1) * limit;
  const where: Prisma.shopping_mall_shipment_trackingsWhereInput = {
    deleted_at: null,
    shipment: {
      seller_id: props.seller.id,
      deleted_at: null,
    },
  };
  if (typeof props.body.shipmentId === "string") {
    where.shopping_mall_shipment_id = props.body.shipmentId;
  }
  if (typeof props.body.carrierName === "string") {
    where.carrier_name = { contains: props.body.carrierName };
  }
  if (typeof props.body.trackingNumber === "string") {
    where.tracking_number = { contains: props.body.trackingNumber };
  }
  if (
    props.body.createdAtFrom !== undefined &&
    props.body.createdAtFrom !== null
  ) {
    where.created_at = {
      ...(typeof where.created_at === "object" && where.created_at !== null
        ? where.created_at
        : {}),
      gte: props.body.createdAtFrom,
    };
  }
  if (props.body.createdAtTo !== undefined && props.body.createdAtTo !== null) {
    where.created_at = {
      ...(typeof where.created_at === "object" && where.created_at !== null
        ? where.created_at
        : {}),
      lte: props.body.createdAtTo,
    };
  }
  const [data, total] = await Promise.all([
    MyGlobal.prisma.shopping_mall_shipment_trackings.findMany({
      where,
      include: {
        shipment: {
          select: {
            id: true,
            status: true,
            created_at: true,
            updated_at: true,
            deleted_at: true,
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
        },
      },
      skip,
      take: limit,
      orderBy: { created_at: "desc" },
    }),
    MyGlobal.prisma.shopping_mall_shipment_trackings.count({ where }),
  ]);
  return {
    pagination: {
      current: page,
      limit,
      records: total,
      pages: total === 0 ? 0 : Math.ceil(total / limit),
    },
    data: data.map((record) => ({
      id: record.id,
      carrierName: record.carrier_name,
      trackingNumber: record.tracking_number,
      createdAt: toISOStringSafe(record.created_at),
      updatedAt: toISOStringSafe(record.updated_at),
      deletedAt:
        record.deleted_at !== null ? toISOStringSafe(record.deleted_at) : null,
      shoppingMallShipmentId: record.shopping_mall_shipment_id,
      shipment: {
        id: record.shipment.id,
        status: record.shipment.status,
        createdAt: toISOStringSafe(record.shipment.created_at),
        updatedAt: toISOStringSafe(record.shipment.updated_at),
        deletedAt:
          record.shipment.deleted_at !== null
            ? toISOStringSafe(record.shipment.deleted_at)
            : null,
        seller: {
          id: record.shipment.seller.id,
          email: record.shipment.seller.email,
          shopName: record.shipment.seller.shop_name,
          shopDescription: record.shipment.seller.shop_description ?? null,
          logoUri: record.shipment.seller.logo_uri ?? null,
          approvalStatus: record.shipment.seller.approval_status,
          rejectionReason: record.shipment.seller.rejection_reason ?? null,
        },
      },
    })),
  };
}
