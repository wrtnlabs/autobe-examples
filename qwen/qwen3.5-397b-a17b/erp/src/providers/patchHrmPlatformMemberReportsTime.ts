import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IHrmPlatformDepartment } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformDepartment";
import { IHrmPlatformEmployee } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformEmployee";
import { IHrmPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformMember";
import { IHrmPlatformOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformOrganization";
import { IHrmPlatformProject } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformProject";
import { IHrmPlatformRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformRole";
import { IHrmPlatformTask } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformTask";
import { IHrmPlatformTimeReport } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformTimeReport";
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
  body: IHrmPlatformTimeReport.IRequest;
}): Promise<IHrmPlatformTimeReport.ISummary> {
  const page = props.body.page ?? 1;
  const limit = props.body.limit ?? 100;
  const skip = (page - 1) * limit;
  const dateFrom = new Date(`${props.body.dateFrom}T00:00:00Z`);
  const dateTo = new Date(`${props.body.dateTo}T23:59:59.999Z`);
  const whereInput = {
    deleted_at: null,
    date: {
      gte: dateFrom,
      lte: dateTo,
    },
    ...(props.body.employeeIds && {
      hrm_platform_employee_id: { in: props.body.employeeIds },
    }),
    ...(props.body.projectIds && {
      hrm_platform_project_id: { in: props.body.projectIds },
    }),
    ...(props.body.taskIds && {
      hrm_platform_task_id: { in: props.body.taskIds },
    }),
    ...(props.body.billable !== undefined && {
      billable: props.body.billable,
    }),
  } satisfies Prisma.hrm_platform_timelogsWhereInput;
  const timelogs = await MyGlobal.prisma.hrm_platform_timelogs.findMany({
    where: whereInput,
    skip,
    take: limit,
    orderBy: { date: "desc" },
    select: {
      hrm_platform_employee_id: true,
      hrm_platform_project_id: true,
      hrm_platform_task_id: true,
      duration_minutes: true,
      billable: true,
    },
  });
  const total_minutes = timelogs.reduce(
    (sum, t) => sum + t.duration_minutes,
    0,
  );
  const billable_minutes = timelogs
    .filter((t) => t.billable)
    .reduce((sum, t) => sum + t.duration_minutes, 0);
  const non_billable_minutes = total_minutes - billable_minutes;
  let employee: IHrmPlatformEmployee.ISummary | null | undefined = undefined;
  let project: IHrmPlatformProject.ISummary | null | undefined = undefined;
  let task: IHrmPlatformTask.ISummary | null | undefined = undefined;
  if (props.body.groupBy === "employee" && timelogs.length > 0) {
    const emp = await MyGlobal.prisma.hrm_platform_employees.findFirstOrThrow({
      where: { id: timelogs[0].hrm_platform_employee_id },
      ...HrmPlatformEmployeeAtSummaryTransformer.select(),
    });
    employee = await HrmPlatformEmployeeAtSummaryTransformer.transform(emp);
  } else if (props.body.groupBy === "project" && timelogs.length > 0) {
    const proj = await MyGlobal.prisma.hrm_platform_projects.findFirstOrThrow({
      where: { id: timelogs[0].hrm_platform_project_id },
      ...HrmPlatformProjectAtSummaryTransformer.select(),
    });
    project = await HrmPlatformProjectAtSummaryTransformer.transform(proj);
  } else if (
    props.body.groupBy === "task" &&
    timelogs.length > 0 &&
    timelogs[0].hrm_platform_task_id
  ) {
    const tsk = await MyGlobal.prisma.hrm_platform_tasks.findFirstOrThrow({
      where: { id: timelogs[0].hrm_platform_task_id },
      ...HrmPlatformTaskAtSummaryTransformer.select(),
    });
    task = await HrmPlatformTaskAtSummaryTransformer.transform(tsk);
  }
  return {
    employee,
    project,
    task,
    total_minutes,
    billable_minutes,
    non_billable_minutes,
  } satisfies IHrmPlatformTimeReport.ISummary;
}
