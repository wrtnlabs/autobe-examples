import { IEcommerceSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceSnapshot";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { AdminPayload } from "../decorators/payload/AdminPayload";
import { EcommerceSnapshotTransformer } from "../transformers/EcommerceSnapshotTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function getEcommerceAdminSnapshotsId(props: {
  admin: AdminPayload;
  id: string & tags.Format<"uuid">;
}): Promise<IEcommerceSnapshot> {
  const snapshot = await MyGlobal.prisma.ecommerce_snapshots.findUnique({
    where: { id: props.id },
    ...EcommerceSnapshotTransformer.select(),
  });
  if (!snapshot) {
    throw new HttpException("Snapshot not found", 404);
  }
  return await EcommerceSnapshotTransformer.transform(snapshot);
}
