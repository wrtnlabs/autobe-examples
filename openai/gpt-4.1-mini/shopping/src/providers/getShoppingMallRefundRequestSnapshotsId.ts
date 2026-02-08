import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IShoppingMallRefundRequestSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallRefundRequestSnapshot";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function getShoppingMallRefundRequestSnapshotsId(props: {
  id: string & tags.Format<"uuid">;
}): Promise<IShoppingMallRefundRequestSnapshot> {
  const snapshot =
    await MyGlobal.prisma.shopping_mall_refund_request_snapshots.findUnique({
      where: { id: props.id },
    });
  if (!snapshot) {
    throw new HttpException("Refund request snapshot not found", 404);
  }
  return snapshot;
}
