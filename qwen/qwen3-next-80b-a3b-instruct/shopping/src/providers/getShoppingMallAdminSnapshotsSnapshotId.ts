import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IShoppingMallSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSnapshot";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { AdminPayload } from "../decorators/payload/AdminPayload";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function getShoppingMallAdminSnapshotsSnapshotId(props: {
  admin: AdminPayload;
  snapshotId: string;
}): Promise<IShoppingMallSnapshot> {
  const snapshot = await MyGlobal.prisma.shopping_mall_snapshots.findUnique({
    where: { id: props.snapshotId },
  });
  if (!snapshot) {
    throw new HttpException("Snapshot not found", 404);
  }
  return JSON.parse(snapshot.snapshot_data);
}
