import { IEcommerceMallAddress } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallAddress";
import { IEcommerceMallOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallOrder";
import { IEcommerceMallShipment } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallShipment";
import { IEcommerceMallShipmentSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallShipmentSnapshot";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { SellerPayload } from "../decorators/payload/SellerPayload";
import { EcommerceMallShipmentSnapshotTransformer } from "../transformers/EcommerceMallShipmentSnapshotTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function getEcommerceMallSellerShipmentsShipmentIdSnapshotsSnapshotId(props: {
  seller: SellerPayload;
  shipmentId: string & tags.Format<"uuid">;
  snapshotId: string & tags.Format<"uuid">;
}): Promise<IEcommerceMallShipmentSnapshot> {
  const snapshot =
    await MyGlobal.prisma.ecommerce_mall_shipment_snapshots.findUniqueOrThrow({
      where: {
        id: props.snapshotId,
        ecommerce_mall_shipment_id: props.shipmentId,
      },
      include: {
        shipment: {
          include: {
            seller: true,
            order: {
              include: {
                customer: true,
                inventoryRecords: true,
                snapshots: true,
                reviews: true,
                shippingAddress: {
                  include: {
                    customer: true,
                    snapshots: true,
                    orders: true,
                  },
                },
                orderItems: true,
                shipments: true,
              },
            },
            snapshots: true,
            _count: {
              select: {
                trackingCodes: true,
              },
            },
            orderItems: true,
            trackingUpdates: true,
          },
        },
      } satisfies Prisma.ecommerce_mall_shipment_snapshotsInclude,
    });
  if (snapshot.shipment.seller.id !== props.seller.id) {
    throw new HttpException("Forbidden", 403);
  }
  return EcommerceMallShipmentSnapshotTransformer.transform(snapshot);
}
