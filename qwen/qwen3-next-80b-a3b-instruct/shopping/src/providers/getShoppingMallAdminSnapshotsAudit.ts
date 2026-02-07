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

// DON'T CHANGE FUNCTION NAME AND PARAMETERS,
// ONLY YOU HAVE TO WRITE THIS FUNCTION BODY, AND USE IMPORTED.
export async function getShoppingMallAdminSnapshotsAudit(props: {
  admin: AdminPayload;
}): Promise<IPageIShoppingMallSnapshot> {
  const { admin } = props;
  // Only admin parameter is allowed. Remove all other filters since they're not in signature.
  const limit = 10 as number &
    tags.Type<"int32"> &
    tags.Minimum<1> &
    tags.Maximum<100>;
  // We cannot apply any actor_id filter because we don't have actorId parameter.
  // Return all shopping mall snapshots (no filtering by admin) as per the required signature.
  // The function signature does NOT permit filtering - it must return all records.
  const where: Prisma.shopping_mall_snapshotsWhereInput = {};
  const data = await MyGlobal.prisma.shopping_mall_snapshots.findMany({
    where,
    orderBy: [{ created_at: "desc" }, { id: "desc" }],
    take: limit,
    select: {
      id: true,
      actor_id: true,
      entity_id: true,
      preceding_snapshot_id: true,
      entity_type: true,
      snapshot_version: true,
      action_type: true,
      snapshot_data: true,
      created_at: true,
      updated_at: true,
      deleted_at: true,
    },
  });
  const total = await MyGlobal.prisma.shopping_mall_snapshots.count({ where });
  // Convert dates to string & tags.Format<'date-time'> using toISOStringSafe
  const transformedData: IShoppingMallSnapshot[] = data.map((item) => ({
    id: item.id,
    actor_id: item.actor_id,
    entity_id: item.entity_id,
    preceding_snapshot_id: item.preceding_snapshot_id as string | null,
    entity_type: item.entity_type,
    snapshot_version: item.snapshot_version,
    action_type: item.action_type,
    snapshot_data: item.snapshot_data,
    created_at: toISOStringSafe(item.created_at) as string &
      tags.Format<"date-time">,
    updated_at: item.updated_at
      ? (toISOStringSafe(item.updated_at) as string & tags.Format<"date-time">)
      : null,
    deleted_at: item.deleted_at
      ? (toISOStringSafe(item.deleted_at) as string & tags.Format<"date-time">)
      : null,
  }));
  // No cursor property - not in interface
  return {
    data: transformedData,
    pagination: {
      current: 1,
      limit,
      records: total,
      pages: Math.ceil(total / limit),
    },
  };
}
