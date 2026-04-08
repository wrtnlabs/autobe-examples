import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IHrmTimeTrackActivityLog } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackActivityLog";
import { IHrmTimeTrackDepartment } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackDepartment";
import { IHrmTimeTrackEmployee } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackEmployee";
import { IHrmTimeTrackEmployeeContract } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackEmployeeContract";
import { IHrmTimeTrackMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackMember";
import { IHrmTimeTrackOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackOrganization";
import { IHrmTimeTrackProject } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackProject";
import { IHrmTimeTrackRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackRole";
import { IHrmTimeTrackTask } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackTask";
import { IHrmTimeTrackTimesheet } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackTimesheet";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageIHrmTimeTrackActivityLog } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIHrmTimeTrackActivityLog";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { MemberPayload } from "../decorators/payload/MemberPayload";
import { HrmTimeTrackActivityLogAtSummaryTransformer } from "../transformers/HrmTimeTrackActivityLogAtSummaryTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchHrmTimeTrackMemberActivityLogs(props: {
  member: MemberPayload;
  body: IHrmTimeTrackActivityLog.IRequest;
}): Promise<IPageIHrmTimeTrackActivityLog.ISummary> {
  const page = props.body.page ?? 1;
  const limit = props.body.limit ?? 20;
  const skip = (page - 1) * limit;
  // Build where clause with multi-tenancy and optional filters
  const whereInput = {
    // Multi-tenancy: only logs from organizations the member belongs to
    hrm_time_track_organization_id: {
      in: (
        await MyGlobal.prisma.hrm_time_track_employees.findMany({
          where: {
            hrm_time_track_member_id: props.member.id,
            deleted_at: null,
          },
          select: { hrm_time_track_organization_id: true },
        })
      ).map((e) => e.hrm_time_track_organization_id),
    },
    // Optional text search on description
    ...(props.body.search !== undefined &&
      props.body.search !== "" && {
        description: {
          contains: props.body.search,
          mode: "insensitive" as const,
        },
      }),
    // Optional activity type filter
    ...(props.body.activity_type !== undefined && {
      activity_type: props.body.activity_type,
    }),
    // Optional date range filter
    ...(props.body.from_date !== undefined && {
      created_at: {
        gte: new Date(props.body.from_date),
      },
    }),
    ...(props.body.to_date !== undefined && {
      created_at: {
        lte: new Date(props.body.to_date),
      },
    }),
    // Optional entity filters
    ...(props.body.employee_id !== undefined && {
      hrm_time_track_employee_id: props.body.employee_id,
    }),
    ...(props.body.project_id !== undefined && {
      hrm_time_track_project_id: props.body.project_id,
    }),
    ...(props.body.task_id !== undefined && {
      hrm_time_track_task_id: props.body.task_id,
    }),
    ...(props.body.timesheet_id !== undefined && {
      hrm_time_track_timesheet_id: props.body.timesheet_id,
    }),
    ...(props.body.role_id !== undefined && {
      hrm_time_track_role_id: props.body.role_id,
    }),
    ...(props.body.employee_contract_id !== undefined && {
      hrm_time_track_employee_contract_id: props.body.employee_contract_id,
    }),
    ...(props.body.department_id !== undefined && {
      hrm_time_track_department_id: props.body.department_id,
    }),
  } satisfies Prisma.hrm_time_track_activity_logsWhereInput;
  const [records, total] = await Promise.all([
    MyGlobal.prisma.hrm_time_track_activity_logs.findMany({
      where: whereInput,
      skip,
      take: limit,
      orderBy: { created_at: "desc" as const },
      ...HrmTimeTrackActivityLogAtSummaryTransformer.select(),
    }),
    MyGlobal.prisma.hrm_time_track_activity_logs.count({
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
      HrmTimeTrackActivityLogAtSummaryTransformer.transform,
    ),
  };
}
