import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IHrmTimeTrackDepartment } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackDepartment";
import { IHrmTimeTrackEmployee } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackEmployee";
import { IHrmTimeTrackMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackMember";
import { IHrmTimeTrackRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackRole";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageIHrmTimeTrackEmployee } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIHrmTimeTrackEmployee";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { MemberPayload } from "../decorators/payload/MemberPayload";
import { HrmTimeTrackEmployeeAtSummaryTransformer } from "../transformers/HrmTimeTrackEmployeeAtSummaryTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function getHrmTimeTrackMemberReportsEmployees(props: {
  member: MemberPayload;
}): Promise<IPageIHrmTimeTrackEmployee.ISummary> {
  // Get the organization from the member's session
  const session =
    await MyGlobal.prisma.hrm_time_track_member_sessions.findUniqueOrThrow({
      where: {
        id: props.member.session_id,
      },
      select: {
        hrm_time_track_organization_id: true,
      },
    });
  const organizationId = session.hrm_time_track_organization_id;
  // Default pagination values
  const page = 1;
  const limit = 100;
  const skip = (page - 1) * limit;
  // Query employees with organization scoping
  const records = await MyGlobal.prisma.hrm_time_track_employees.findMany({
    where: {
      hrm_time_track_organization_id: organizationId,
      deleted_at: null,
    },
    skip,
    take: limit,
    orderBy: {
      created_at: "desc",
    },
    ...HrmTimeTrackEmployeeAtSummaryTransformer.select(),
  });
  // Count total records for pagination
  const total = await MyGlobal.prisma.hrm_time_track_employees.count({
    where: {
      hrm_time_track_organization_id: organizationId,
      deleted_at: null,
    },
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
      HrmTimeTrackEmployeeAtSummaryTransformer.transform,
    ),
  };
}
