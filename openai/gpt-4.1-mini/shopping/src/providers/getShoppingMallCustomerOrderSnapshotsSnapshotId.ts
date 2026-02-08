import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IShoppingMallOrderSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrderSnapshot";
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

export async function getShoppingMallCustomerOrderSnapshotsSnapshotId(props: {
  customer: CustomerPayload;
  snapshotId: string & tags.Format<"uuid">;
}): Promise<IShoppingMallOrderSnapshot> {
  const snapshot =
    await MyGlobal.prisma.shopping_mall_order_snapshots.findUnique({
      where: { id: props.snapshotId },
    });
  if (!snapshot) {
    throw new HttpException("Snapshot not found", 404);
  }
  return snapshot;
}
