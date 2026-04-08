import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IHrmTimeTrackMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackMember";
import { IHrmTimeTrackRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackRole";
import { IHrmTimeTrackRoleSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackRoleSnapshot";
import { IHrmTimeTrackRoleSnapshotPermission } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackRoleSnapshotPermission";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageIHrmTimeTrackRoleSnapshotPermission } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIHrmTimeTrackRoleSnapshotPermission";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { MemberPayload } from "../decorators/payload/MemberPayload";
import { HrmTimeTrackRoleSnapshotPermissionAtSummaryTransformer } from "../transformers/HrmTimeTrackRoleSnapshotPermissionAtSummaryTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchHrmTimeTrackMemberRoleSnapshotsSnapshotIdPermissions(props: {
  member: MemberPayload;
  snapshotId: string & tags.Format<"uuid">;
  body: IHrmTimeTrackRoleSnapshotPermission.IRequest;
}): Promise<IPageIHrmTimeTrackRoleSnapshotPermission.ISummary> {
  // Validate snapshot exists
  await MyGlobal.prisma.hrm_time_track_role_snapshots.findUniqueOrThrow({
    where: { id: props.snapshotId },
  });
  // Build where clause
  const whereInput: Prisma.hrm_time_track_role_snapshot_permissionsWhereInput =
    {
      hrm_time_track_role_snapshot_id: props.snapshotId,
    };
  // Apply search filter on permission name
  if (
    props.body.search !== undefined &&
    props.body.search !== null &&
    props.body.search.length > 0
  ) {
    whereInput.permission = {
      contains: props.body.search,
      mode: "insensitive",
    };
  }
  // Apply date range filters
  const createdAtFilter: Prisma.DateTimeFilter = {};
  if (
    props.body.created_at_from !== undefined &&
    props.body.created_at_from !== null
  ) {
    createdAtFilter.gte = new Date(props.body.created_at_from);
  }
  if (
    props.body.created_at_to !== undefined &&
    props.body.created_at_to !== null
  ) {
    createdAtFilter.lte = new Date(props.body.created_at_to);
  }
  if (createdAtFilter.gte !== undefined || createdAtFilter.lte !== undefined) {
    whereInput.created_at = createdAtFilter;
  }
  // Handle pagination
  const limit = props.body.limit ?? 20;
  const page = props.body.page ?? 1;
  const skip = (page - 1) * limit;
  const records =
    await MyGlobal.prisma.hrm_time_track_role_snapshot_permissions.findMany({
      where: whereInput,
      skip,
      take: limit,
      orderBy: { created_at: "asc" },
      ...HrmTimeTrackRoleSnapshotPermissionAtSummaryTransformer.select(),
    });
  const total =
    await MyGlobal.prisma.hrm_time_track_role_snapshot_permissions.count({
      where: whereInput,
    });
  return {
    pagination: {
      current: page,
      limit: limit,
      records: total,
      pages: Math.ceil(total / limit),
    },
    data: await ArrayUtil.asyncMap(
      records,
      HrmTimeTrackRoleSnapshotPermissionAtSummaryTransformer.transform,
    ),
  };
}
