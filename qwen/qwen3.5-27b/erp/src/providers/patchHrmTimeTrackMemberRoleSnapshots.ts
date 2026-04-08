import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IHrmTimeTrackMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackMember";
import { IHrmTimeTrackRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackRole";
import { IHrmTimeTrackRoleSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackRoleSnapshot";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageIHrmTimeTrackRoleSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIHrmTimeTrackRoleSnapshot";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { MemberPayload } from "../decorators/payload/MemberPayload";
import { HrmTimeTrackRoleSnapshotAtSummaryTransformer } from "../transformers/HrmTimeTrackRoleSnapshotAtSummaryTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchHrmTimeTrackMemberRoleSnapshots(props: {
  member: MemberPayload;
  body: IHrmTimeTrackRoleSnapshot.IRequest;
}): Promise<IPageIHrmTimeTrackRoleSnapshot.ISummary> {
  const page = props.body.page ?? 1;
  const limit = props.body.limit ?? 20;
  const skip = (page - 1) * limit;
  const whereInput: Prisma.hrm_time_track_role_snapshotsWhereInput = {
    ...(props.body.search !== undefined && {
      name: {
        contains: props.body.search,
        mode: "insensitive",
      },
    }),
    ...(props.body.hrm_time_track_role_id !== undefined && {
      hrm_time_track_role_id: props.body.hrm_time_track_role_id,
    }),
    ...(props.body.created_by_member_id !== undefined && {
      created_by_member_id: props.body.created_by_member_id,
    }),
    ...(props.body.created_at_from !== undefined && {
      created_at: {
        gte: props.body.created_at_from,
      },
    }),
    ...(props.body.created_at_to !== undefined && {
      created_at: {
        lte: props.body.created_at_to,
      },
    }),
    ...(props.body.is_builtin !== undefined && {
      is_builtin: props.body.is_builtin,
    }),
  } satisfies Prisma.hrm_time_track_role_snapshotsWhereInput;
  const records = await MyGlobal.prisma.hrm_time_track_role_snapshots.findMany({
    where: whereInput,
    skip,
    take: limit,
    orderBy: { created_at: "desc" },
    ...HrmTimeTrackRoleSnapshotAtSummaryTransformer.select(),
  });
  const total = await MyGlobal.prisma.hrm_time_track_role_snapshots.count({
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
      HrmTimeTrackRoleSnapshotAtSummaryTransformer.transform,
    ),
  };
}
