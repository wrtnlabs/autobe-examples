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

export async function patchHrmTimeTrackMemberEmployees(props: {
  member: MemberPayload;
  body: IHrmTimeTrackEmployee.IRequest;
}): Promise<IPageIHrmTimeTrackEmployee.ISummary> {
  const page = props.body.page ?? 1;
  const limit = props.body.limit ?? 100;
  const skip = (page - 1) * limit;
  // Get organization from session
  const session =
    await MyGlobal.prisma.hrm_time_track_member_sessions.findUniqueOrThrow({
      where: {
        id: props.member.session_id,
      },
      select: {
        hrm_time_track_organization_id: true,
      },
    });
  // Build WHERE clause
  const whereInput: Prisma.hrm_time_track_employeesWhereInput = {
    deleted_at: null,
    hrm_time_track_organization_id: session.hrm_time_track_organization_id,
    ...(props.body.departmentId && {
      hrm_time_track_department_id: props.body.departmentId,
    }),
    ...(props.body.employmentType && {
      employment_type: props.body.employmentType,
    }),
    ...(props.body.status && {
      status: props.body.status,
    }),
    ...(props.body.search && {
      OR: [
        {
          position: {
            contains: props.body.search,
            mode: "insensitive",
          },
        },
        {
          member: {
            email: {
              contains: props.body.search,
              mode: "insensitive",
            },
          },
        },
      ],
    }),
  } satisfies Prisma.hrm_time_track_employeesWhereInput;
  const [records, total] = await Promise.all([
    MyGlobal.prisma.hrm_time_track_employees.findMany({
      where: whereInput,
      skip,
      take: limit,
      orderBy: { created_at: "desc" },
      ...HrmTimeTrackEmployeeAtSummaryTransformer.select(),
    }),
    MyGlobal.prisma.hrm_time_track_employees.count({
      where: whereInput,
    }),
  ]);
  return {
    pagination: {
      current: page,
      limit: limit,
      records: total,
      pages: Math.ceil(total / limit),
    } satisfies IPage.IPagination,
    data: await ArrayUtil.asyncMap(
      records,
      HrmTimeTrackEmployeeAtSummaryTransformer.transform,
    ),
  };
}
