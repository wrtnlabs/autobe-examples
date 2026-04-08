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
  orderId: string;
  snapshotId: string;
}): Promise<IEcommerceMallOrderSnapshot> {
  const snapshot =
    await MyGlobal.prisma.ecommerce_mall_order_snapshots.findFirstOrThrow({
      where: {
        id: props.snapshotId,
        order_id: props.orderId,
      },
      ...EcommerceMallOrderSnapshotTransformer.select(),
    });
  return await EcommerceMallOrderSnapshotTransformer.transform(snapshot);
}
