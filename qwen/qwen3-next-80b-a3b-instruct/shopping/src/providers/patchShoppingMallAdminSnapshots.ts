import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageIShoppingMallSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallSnapshot";
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

export async function patchShoppingMallAdminSnapshots(props: {
  admin: AdminPayload;
  body: IShoppingMallSnapshot.IRequest;
}): Promise<IPageIShoppingMallSnapshot.ISummary> {
  const page = 1;
  const limit = 50;
  const skip = (page - 1) * limit;
  if (limit > 1000) {
    throw new HttpException("Maximum limit is 1000", 400);
  }
  const where: Prisma.shopping_mall_snapshotsWhereInput = {
    deleted_at: null,
  } satisfies Prisma.shopping_mall_snapshotsWhereInput;
  const data = await MyGlobal.prisma.shopping_mall_snapshots.findMany({
    where,
    orderBy: { created_at: "desc" },
    skip,
    take: limit,
    select: {
      id: true,
      actor_id: true,
      entity_id: true,
      entity_type: true,
      action_type: true,
      snapshot_version: true,
      created_at: true,
      updated_at: true,
    },
  });
  const total = await MyGlobal.prisma.shopping_mall_snapshots.count({
    where,
  });
  const summaryData = data.map((snap) => {
    return {
      id: snap.id as string & tags.Format<"uuid">,
      actor_id: snap.actor_id as string & tags.Format<"uuid">,
      entity_id: snap.entity_id as string & tags.Format<"uuid">,
      entity_type: snap.entity_type,
      action_type: snap.action_type,
      snapshot_version: snap.snapshot_version,
      created_at: toISOStringSafe(snap.created_at),
      updated_at: toISOStringSafe(snap.updated_at),
    } satisfies IShoppingMallSnapshot.ISummary;
  });
  return {
    data: summaryData,
    pagination: {
      current: page,
      limit,
      records: total,
      pages: Math.ceil(total / limit),
    } satisfies IPage.IPagination,
  };
}
