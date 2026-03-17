import { IEcommerceMallOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallOrder";
import { IEcommerceMallOrderSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallOrderSnapshot";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { AdminPayload } from "../decorators/payload/AdminPayload";
import { EcommerceMallOrderSnapshotTransformer } from "../transformers/EcommerceMallOrderSnapshotTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function getEcommerceMallAdminOrdersOrderIdSnapshotsSnapshotId(props: {
  admin: AdminPayload;
  orderId: string & tags.Format<"uuid">;
  snapshotId: string & tags.Format<"uuid">;
}): Promise<IEcommerceMallOrderSnapshot> {
  const snapshot =
    await MyGlobal.prisma.ecommerce_mall_order_snapshots.findUniqueOrThrow({
      where: { id: props.snapshotId },
      ...EcommerceMallOrderSnapshotTransformer.select(),
    });
  // Validate snapshot belongs to the specified order
  if (snapshot.order_id !== props.orderId) {
    throw new HttpException(
      "Snapshot does not belong to the specified order",
      404,
    );
  }
  return await EcommerceMallOrderSnapshotTransformer.transform(snapshot);
}
