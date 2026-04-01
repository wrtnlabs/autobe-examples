import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IShoppingMallSnapshotPayload } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSnapshotPayload";
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

export async function getShoppingMallAdminSnapshotsSnapshotIdPayloadsSnapshotPayloadId(props: {
  admin: AdminPayload;
  snapshotId: string & tags.Format<"uuid">;
  snapshotPayloadId: string & tags.Format<"uuid">;
}): Promise<IShoppingMallSnapshotPayload> {
  return {} as unknown as IShoppingMallSnapshotPayload;
}
