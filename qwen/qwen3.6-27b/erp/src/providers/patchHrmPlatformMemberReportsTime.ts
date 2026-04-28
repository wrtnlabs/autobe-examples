import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IHrmPlatformDepartment } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformDepartment";
import { IHrmPlatformEmployee } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformEmployee";
import { IHrmPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformMember";
import { IHrmPlatformOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformOrganization";
import { IHrmPlatformProject } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformProject";
import { IHrmPlatformRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformRole";
import { IHrmPlatformTask } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformTask";
import { IReportTime } from "@ORGANIZATION/PROJECT-api/lib/structures/IReportTime";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { MemberPayload } from "../decorators/payload/MemberPayload";
import { HrmPlatformEmployeeAtSummaryTransformer } from "../transformers/HrmPlatformEmployeeAtSummaryTransformer";
import { HrmPlatformProjectAtSummaryTransformer } from "../transformers/HrmPlatformProjectAtSummaryTransformer";
import { HrmPlatformTaskAtSummaryTransformer } from "../transformers/HrmPlatformTaskAtSummaryTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchHrmPlatformMemberReportsTime(props: {
  member: MemberPayload;
  body: IReportTime.IRequest;
}): Promise<IReportTime> {
  const empty: IReportTime = {
    employee: null,
    project: null,
    task: null,
    total_hours: 0,
    billable_hours: 0,
    non_billable_hours: 0,
  } satisfies IReportTime;
  if (props.body.from > props.body.to) {
    return empty;
  }
  const employee = await MyGlobal.prisma.hrm_platform_employees.findFirst({
    where: {
      hrm_platform_member_id: props.member.id,
      deleted_at: null,
    },
    select: {
      id: true,
      hrm_platform_organization_id: true,
      role: {
        select: {
          name: true,
        },
      } satisfies Prisma.hrm_platform_rolesFindManyArgs,
    },
  });
  if (employee === null) {
    return empty;
  }
  const canViewAll =
    employee.role.name === "Owner" || employee.role.name === "Manager";
  const where: Prisma.hrm_platform_timelogsWhereInput = {
    date: {
      gte: props.body.from,
      lte: props.body.to,
    },
    deleted_at: null,
    employee: {
      deleted_at: null,
      ...(canViewAll
        ? {
            hrm_platform_organization_id: employee.hrm_platform_organization_id,
          }
        : {}),
    },
    project: {
      deleted_at: null,
    },
    ...(canViewAll ? {} : { hrm_platform_employee_id: employee.id }),
    ...(props.body.employee_id !== undefined
      ? { hrm_platform_employee_id: props.body.employee_id }
      : {}),
    ...(props.body.project_id !== undefined
      ? { hrm_platform_project_id: props.body.project_id }
      : {}),
    ...(props.body.task_id !== undefined
      ? { hrm_platform_task_id: props.body.task_id }
      : {}),
    ...(props.body.billable !== undefined
      ? { billable: props.body.billable }
      : {}),
  } satisfies Prisma.hrm_platform_timelogsWhereInput;
  const timelogs = await MyGlobal.prisma.hrm_platform_timelogs.findMany({
    where,
    select: {
      date: true,
      duration_minutes: true,
      billable: true,
      employee: HrmPlatformEmployeeAtSummaryTransformer.select(),
      project: HrmPlatformProjectAtSummaryTransformer.select(),
      task: HrmPlatformTaskAtSummaryTransformer.select(),
    },
  });
  if (timelogs.length === 0) {
    return empty;
  }
  const dimension = props.body.dimension ?? "employee";
  interface IGroupResult {
    total: number;
    billable: number;
    nonBillable: number;
    topLog: (typeof timelogs)[0];
  }
  const groups = new Map<string, IGroupResult>();
  for (const log of timelogs) {
    const hours = log.duration_minutes / 60;
    const billable = log.billable ? hours : 0;
    const nonBillable = log.billable ? 0 : hours;
    let key: string;
    if (dimension === "task" && log.task === null) {
      continue;
    }
    if (dimension === "employee") {
      key = log.employee.id;
    } else if (dimension === "project") {
      key = log.project.id;
    } else {
      key = log.task!.id;
    }
    const existing = groups.get(key);
    if (existing === undefined) {
      groups.set(key, {
        total: hours,
        billable,
        nonBillable,
        topLog: log,
      });
    } else {
      existing.total += hours;
      existing.billable += billable;
      existing.nonBillable += nonBillable;
      if (hours > existing.topLog.duration_minutes / 60) {
        existing.topLog = log;
      }
    }
  }
  if (groups.size === 0) {
    return empty;
  }
  const entries = Array.from(groups.entries());
  const topEntry = entries.reduce<IGroupResult>(
    (best, [, current]) => (current.total > best.total ? current : best),
    entries[0]![1],
  );
  const topLog = topEntry.topLog;
  const employeeDto = topLog.employee
    ? await HrmPlatformEmployeeAtSummaryTransformer.transform(topLog.employee)
    : null;
  const projectDto = topLog.project
    ? await HrmPlatformProjectAtSummaryTransformer.transform(topLog.project)
    : null;
  const taskDto = topLog.task
    ? await HrmPlatformTaskAtSummaryTransformer.transform(topLog.task)
    : null;
  return {
    employee: employeeDto,
    project: projectDto,
    task: taskDto,
    total_hours: topEntry.total,
    billable_hours: topEntry.billable,
    non_billable_hours: topEntry.nonBillable,
  } satisfies IReportTime;
}


//--------------------------------------------------------------
// TEMPLATE CODE
//--------------------------------------------------------------
// Complete the code below, disregard the import part and return only the function part.
// 
// ```typescript
// import { ArrayUtil } from "@nestia/e2e";
// import { HttpException } from "@nestjs/common";
// import { Prisma } from "@prisma/sdk";
// import jwt from "jsonwebtoken";
// import typia, { tags } from "typia";
// import { v4 } from "uuid";
// import { MyGlobal } from "../MyGlobal";
// import { PasswordUtil } from "../utils/PasswordUtil";
// import { toISOStringSafe } from "../utils/toISOStringSafe"
// 
// import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
// import { IReportTime } from "@ORGANIZATION/PROJECT-api/lib/structures/IReportTime";
// import { IHrmPlatformEmployee } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformEmployee";
// import { IHrmPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformMember";
// import { IHrmPlatformRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformRole";
// import { IHrmPlatformDepartment } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformDepartment";
// import { IHrmPlatformProject } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformProject";
// import { IHrmPlatformOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformOrganization";
// import { IHrmPlatformTask } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformTask";
// 
// // DON'T CHANGE FUNCTION NAME AND PARAMETERS,
// // ONLY YOU HAVE TO WRITE THIS FUNCTION BODY, AND USE IMPORTED.
// export async function patchHrmPlatformMemberReportsTime(props: {
//   member: MemberPayload;
//   body: IReportTime.IRequest;
// }): Promise<IReportTime> {
//   return {
//     employee: await HrmPlatformEmployeeAtSummaryTransformer.transform(...),
//     project: await HrmPlatformProjectAtSummaryTransformer.transform(...),
//     task: await HrmPlatformTaskAtSummaryTransformer.transform(...),
//     total_hours: ...,
//     billable_hours: ...,
//     non_billable_hours: ...,
//   };
// }
// ```
//--------------------------------------------------------------