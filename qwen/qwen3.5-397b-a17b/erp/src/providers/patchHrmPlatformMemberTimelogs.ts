import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IHrmPlatformDepartment } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformDepartment";
import { IHrmPlatformEmployee } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformEmployee";
import { IHrmPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformMember";
import { IHrmPlatformOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformOrganization";
import { IHrmPlatformProject } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformProject";
import { IHrmPlatformRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformRole";
import { IHrmPlatformTask } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformTask";
import { IHrmPlatformTimelog } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformTimelog";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageIHrmPlatformTimelog } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIHrmPlatformTimelog";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { MemberPayload } from "../decorators/payload/MemberPayload";
import { HrmPlatformTimelogAtSummaryTransformer } from "../transformers/HrmPlatformTimelogAtSummaryTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchHrmPlatformMemberTimelogs(props: {
  member: MemberPayload;
  body: IHrmPlatformTimelog.IRequest;
}): Promise<IPageIHrmPlatformTimelog.ISummary> {
  const page = props.body.page ?? 1;
  const limit = props.body.limit ?? 100;
  const skip = (page - 1) * limit;
  const employee =
    await MyGlobal.prisma.hrm_platform_employees.findFirstOrThrow({
      where: {
        member_id: props.member.id,
        deleted_at: null,
      },
      select: {
        id: true,
        organization_id: true,
        role: {
          select: {
            rolePermissions: {
              select: {
                permission: {
                  select: {
                    code: true,
                  },
                },
              },
            },
          },
        },
      },
    });
  const hasTimeViewAll = employee.role.rolePermissions.some(
    (rp) => rp.permission.code === "time:view_all",
  );
  const whereInput: Prisma.hrm_platform_timelogsWhereInput = {
    deleted_at: null,
    employee: {
      organization_id: employee.organization_id,
    },
    ...(hasTimeViewAll ? {} : { hrm_platform_employee_id: employee.id }),
    ...(props.body.dateFrom !== undefined && {
      date: { gte: new Date(props.body.dateFrom) },
    }),
    ...(props.body.dateTo !== undefined && {
      date: { lte: new Date(props.body.dateTo) },
    }),
    ...(props.body.hrmPlatformProjectId !== undefined &&
      props.body.hrmPlatformProjectId !== null && {
        hrm_platform_project_id: props.body.hrmPlatformProjectId,
      }),
    ...(props.body.hrmPlatformTaskId !== undefined &&
      props.body.hrmPlatformTaskId !== null && {
        hrm_platform_task_id: props.body.hrmPlatformTaskId,
      }),
    ...(props.body.billable !== undefined && {
      billable: props.body.billable,
    }),
    ...(props.body.hrmPlatformTimesheetId !== undefined &&
      props.body.hrmPlatformTimesheetId !== null && {
        hrm_platform_timesheet_id: props.body.hrmPlatformTimesheetId,
      }),
  };
  const [data, total] = await Promise.all([
    MyGlobal.prisma.hrm_platform_timelogs.findMany({
      where: whereInput,
      skip,
      take: limit,
      orderBy: [{ date: "desc" }, { created_at: "desc" }],
      ...HrmPlatformTimelogAtSummaryTransformer.select(),
    }),
    MyGlobal.prisma.hrm_platform_timelogs.count({
      where: whereInput,
    }),
  ]);
  return {
    pagination: {
      current: page,
      limit: limit,
      records: total,
      pages: Math.ceil(total / limit),
    },
    data: await ArrayUtil.asyncMap(
      data,
      HrmPlatformTimelogAtSummaryTransformer.transform,
    ),
  };
}
