import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IHrmTimeTrackDepartment } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackDepartment";
import { IHrmTimeTrackEmployeeSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackEmployeeSnapshot";
import { IHrmTimeTrackMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackMember";
import { IHrmTimeTrackOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackOrganization";
import { IHrmTimeTrackRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackRole";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageIHrmTimeTrackEmployeeSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIHrmTimeTrackEmployeeSnapshot";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { MemberPayload } from "../decorators/payload/MemberPayload";
import { HrmTimeTrackEmployeeSnapshotAtSummaryTransformer } from "../transformers/HrmTimeTrackEmployeeSnapshotAtSummaryTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchHrmTimeTrackMemberEmployeeSnapshots(props: {
  member: MemberPayload;
  body: IHrmTimeTrackEmployeeSnapshot.IRequest;
}): Promise<IPageIHrmTimeTrackEmployeeSnapshot.ISummary> {
  const page = props.body.page ?? 1;
  const limit = props.body.limit ?? 20;
  const skip = (page - 1) * limit;
  const whereInput: Prisma.hrm_time_track_employee_snapshotsWhereInput = {};
  if (props.body.employee_id !== undefined) {
    whereInput.hrm_time_track_employee_id = props.body.employee_id;
  }
  if (props.body.organization_id !== undefined) {
    whereInput.hrm_time_track_organization_id = props.body.organization_id;
  }
  if (props.body.member_id !== undefined) {
    whereInput.hrm_time_track_member_id = props.body.member_id;
  }
  if (props.body.status !== undefined) {
    whereInput.status = props.body.status;
  }
  if (props.body.employment_type !== undefined) {
    whereInput.employment_type = props.body.employment_type;
  }
  if (props.body.department_id !== undefined) {
    whereInput.hrm_time_track_department_id = props.body.department_id;
  }
  if (props.body.role_id !== undefined) {
    whereInput.hrm_time_track_role_id = props.body.role_id;
  }
  if (
    props.body.created_at_start !== undefined ||
    props.body.created_at_end !== undefined
  ) {
    const createdAtFilter: Prisma.DateTimeFilter = {};
    if (props.body.created_at_start !== undefined) {
      createdAtFilter.gte = new Date(props.body.created_at_start);
    }
    if (props.body.created_at_end !== undefined) {
      createdAtFilter.lte = new Date(props.body.created_at_end);
    }
    whereInput.created_at = createdAtFilter;
  }
  const sortField = props.body.sort_field ?? "created_at";
  const sortDirection = props.body.sort_direction ?? "desc";
  const orderByInput: Prisma.hrm_time_track_employee_snapshotsOrderByWithRelationInput =
    {
      [sortField]: sortDirection,
    } satisfies Prisma.hrm_time_track_employee_snapshotsOrderByWithRelationInput;
  const data = await MyGlobal.prisma.hrm_time_track_employee_snapshots.findMany(
    {
      where: whereInput,
      skip,
      take: limit,
      orderBy: orderByInput,
      ...HrmTimeTrackEmployeeSnapshotAtSummaryTransformer.select(),
    },
  );
  const total = await MyGlobal.prisma.hrm_time_track_employee_snapshots.count({
    where: whereInput,
  });
  return {
    pagination: {
      current: page,
      limit: limit,
      records: total,
      pages: Math.ceil(total / limit),
    } satisfies IPage.IPagination,
    data: await ArrayUtil.asyncMap(
      data,
      HrmTimeTrackEmployeeSnapshotAtSummaryTransformer.transform,
    ),
  };
}
