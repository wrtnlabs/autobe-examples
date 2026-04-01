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
import { AdminPayload } from "../decorators/payload/AdminPayload";
import { EcommerceMallShipmentSnapshotTransformer } from "../transformers/EcommerceMallShipmentSnapshotTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function getEcommerceMallAdminShipmentsShipmentIdSnapshotsSnapshotId(props: {
  admin: AdminPayload;
  shipmentId: string & tags.Format<"uuid">;
  snapshotId: string & tags.Format<"uuid">;
}): Promise<IEcommerceMallShipmentSnapshot> {
  // Verify parent shipment exists and is not deleted (404 if orphaned snapshot)
  await MyGlobal.prisma.ecommerce_mall_shipments.findUniqueOrThrow({
    where: {
      id: props.shipmentId,
      deleted_at: null,
    },
  });
  // Fetch snapshot with shipment relation for transformation
  const snapshot =
    await MyGlobal.prisma.ecommerce_mall_shipment_snapshots.findUniqueOrThrow({
      where: { id: props.snapshotId },
      ...EcommerceMallShipmentSnapshotTransformer.select(),
    });
  // Transform and return
  return await EcommerceMallShipmentSnapshotTransformer.transform(snapshot);
}
