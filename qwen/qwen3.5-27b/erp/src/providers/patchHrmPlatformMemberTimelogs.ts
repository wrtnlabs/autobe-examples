import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IHrmPlatformDepartment } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformDepartment";
import { IHrmPlatformEmployee } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformEmployee";
import { IHrmPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformMember";
import { IHrmPlatformOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformOrganization";
import { IHrmPlatformOrganizationLogo } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformOrganizationLogo";
import { IHrmPlatformOrganizationSetting } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformOrganizationSetting";
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
  const limit = props.body.limit ?? 20;
  const skip = (page - 1) * limit;
  // Get current employee from member session
  const employee = await MyGlobal.prisma.hrm_platform_employees.findFirst({
    where: {
      member_id: props.member.id,
      deleted_at: null,
    },
    select: {
      id: true,
    },
  });
  if (employee === null) {
    throw new HttpException("Employee record not found", 404);
  }
  // Build WHERE clause
  const whereInput: Prisma.hrm_platform_timelogsWhereInput = {
    deleted_at: null,
    hrm_platform_employee_id: employee.id,
    ...(props.body.start_date !== undefined && {
      date: {
        gte: new Date(props.body.start_date),
      },
    }),
    ...(props.body.end_date !== undefined && {
      date: {
        lte: new Date(props.body.end_date),
      },
    }),
    ...(props.body.project_id !== undefined && {
      hrm_platform_project_id: props.body.project_id,
    }),
    ...(props.body.task_id !== undefined && {
      hrm_platform_task_id: props.body.task_id,
    }),
    ...(props.body.billable !== undefined && {
      billable: props.body.billable,
    }),
    ...(props.body.employee_id !== undefined && {
      hrm_platform_employee_id: props.body.employee_id,
    }),
  } satisfies Prisma.hrm_platform_timelogsWhereInput;
  // Build ORDER BY clause
  const orderByInput: Prisma.hrm_platform_timelogsOrderByWithRelationInput = (
    props.body.sort === "duration"
      ? { duration: props.body.order === "asc" ? "asc" : "desc" }
      : props.body.sort === "project_id"
        ? {
            hrm_platform_project_id:
              props.body.order === "asc" ? "asc" : "desc",
          }
        : props.body.sort === "employee_id"
          ? {
              hrm_platform_employee_id:
                props.body.order === "asc" ? "asc" : "desc",
            }
          : { date: props.body.order === "asc" ? "asc" : "desc" }
  ) satisfies Prisma.hrm_platform_timelogsOrderByWithRelationInput;
  // Query timelogs
  const data = await MyGlobal.prisma.hrm_platform_timelogs.findMany({
    where: whereInput,
    skip,
    take: limit,
    orderBy: orderByInput,
    ...HrmPlatformTimelogAtSummaryTransformer.select(),
  });
  // Get total count
  const total = await MyGlobal.prisma.hrm_platform_timelogs.count({
    where: whereInput,
  });
  // Transform results
  const transformedData = await ArrayUtil.asyncMap(
    data,
    HrmPlatformTimelogAtSummaryTransformer.transform,
  );
  return {
    pagination: {
      current: page,
      limit: limit,
      records: total,
      pages: Math.ceil(total / limit),
    },
    data: transformedData,
  };
}
