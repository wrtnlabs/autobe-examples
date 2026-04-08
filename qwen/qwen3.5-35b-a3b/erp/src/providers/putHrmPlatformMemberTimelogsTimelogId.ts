import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IHrmPlatformDepartment } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformDepartment";
import { IHrmPlatformEmployee } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformEmployee";
import { IHrmPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformMember";
import { IHrmPlatformOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformOrganization";
import { IHrmPlatformProject } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformProject";
import { IHrmPlatformRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformRole";
import { IHrmPlatformTask } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformTask";
import { IHrmPlatformTimelog } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformTimelog";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { MemberPayload } from "../decorators/payload/MemberPayload";
import { HrmPlatformTimelogTransformer } from "../transformers/HrmPlatformTimelogTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function putHrmPlatformMemberTimelogsTimelogId(props: {
  member: MemberPayload;
  timelogId: string & tags.Format<"uuid">;
  body: IHrmPlatformTimelog.IUpdate;
}): Promise<IHrmPlatformTimelog> {
  const timelog = await MyGlobal.prisma.hrm_platform_timelogs.findUniqueOrThrow(
    {
      where: { id: props.timelogId },
      select: {
        id: true,
        employee_id: true,
        project_id: true,
        task_id: true,
        start_datetime: true,
        end_datetime: true,
        duration_minutes: true,
        billable: true,
        deleted_at: true,
      },
    },
  );
  if (timelog.deleted_at !== null) {
    throw new HttpException("Timelog is soft-deleted", 400);
  }
  const employee =
    await MyGlobal.prisma.hrm_platform_employees.findFirstOrThrow({
      where: { id: props.member.id, deleted_at: null },
      select: { id: true, organization: true },
    });
  if (timelog.employee_id !== employee.id) {
    throw new HttpException("Forbidden", 403);
  }
  const projectLookupId = props.body.project_id ?? timelog.project_id;
  const project = await MyGlobal.prisma.hrm_platform_projects.findFirstOrThrow({
    where: {
      id: projectLookupId,
      organization_id: employee.organization.id,
    },
    select: { id: true, status: true },
  });
  if (project.status === "completed") {
    throw new HttpException("Project is completed", 409);
  }
  if (props.body.task_id !== undefined && props.body.task_id !== null) {
    await MyGlobal.prisma.hrm_platform_tasks.findFirstOrThrow({
      where: {
        id: props.body.task_id,
        project_id: project.id,
      },
    });
  }
  const timesheetTimelogs =
    await MyGlobal.prisma.hrm_platform_timesheet_timelogs.findMany({
      where: { hrm_platform_timelog_id: props.timelogId },
    });
  for (const tt of timesheetTimelogs) {
    const timesheet = await MyGlobal.prisma.hrm_platform_timesheets.findUnique({
      where: { id: tt.hrm_platform_timesheet_id },
      select: { status: true },
    });
    if (timesheet?.status !== "draft") {
      throw new HttpException(
        "Timelog is part of a submitted or approved timesheet",
        409,
      );
    }
  }
  const startDatetimeValue: string & tags.Format<"date-time"> =
    props.body.start_datetime ?? toISOStringSafe(timelog.start_datetime);
  const endDatetimeValue: string & tags.Format<"date-time"> =
    props.body.end_datetime ?? toISOStringSafe(timelog.end_datetime);
  const newStartDatetime = new Date(startDatetimeValue);
  const newEndDatetime = new Date(endDatetimeValue);
  if (newEndDatetime < newStartDatetime) {
    throw new HttpException("End datetime must be after start datetime", 400);
  }
  const newDurationMinutes = Math.round(
    (newEndDatetime.getTime() - newStartDatetime.getTime()) / 60000,
  );
  const now = new Date();
  await MyGlobal.prisma.hrm_platform_timelogs.update({
    where: { id: props.timelogId },
    data: {
      ...(props.body.billable !== undefined && {
        billable: props.body.billable,
      }),
      ...(props.body.description !== undefined && {
        description: props.body.description,
      }),
      ...(props.body.end_datetime !== undefined && {
        end_datetime: new Date(props.body.end_datetime),
      }),
      ...(props.body.project_id !== undefined && {
        project_id: props.body.project_id,
      }),
      ...(props.body.start_datetime !== undefined && {
        start_datetime: new Date(props.body.start_datetime),
      }),
      ...(props.body.task_id !== undefined && {
        task_id: props.body.task_id,
      }),
      duration_minutes: newDurationMinutes,
      updated_at: now,
    },
  });
  const updated = await MyGlobal.prisma.hrm_platform_timelogs.findUniqueOrThrow(
    {
      where: { id: props.timelogId },
      ...HrmPlatformTimelogTransformer.select(),
    },
  );
  return await HrmPlatformTimelogTransformer.transform(updated);
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
// import { IHrmPlatformTimelog } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformTimelog";
// import { IHrmPlatformEmployee } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformEmployee";
// import { IHrmPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformMember";
// import { IHrmPlatformRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformRole";
// import { IHrmPlatformOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformOrganization";
// import { IHrmPlatformDepartment } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformDepartment";
// import { IHrmPlatformProject } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformProject";
// import { IHrmPlatformTask } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformTask";
// 
// // DON'T CHANGE FUNCTION NAME AND PARAMETERS,
// // ONLY YOU HAVE TO WRITE THIS FUNCTION BODY, AND USE IMPORTED.
// export async function putHrmPlatformMemberTimelogsTimelogId(props: {
//   member: MemberPayload;
//   timelogId: string & tags.Format<"uuid">;
//   body: IHrmPlatformTimelog.IUpdate;
// }): Promise<IHrmPlatformTimelog> {
//   await MyGlobal.prisma.hrm_platform_timelogs.update({
//     where: { ... },
//     data: { ... },
//   });
//   const updated = await MyGlobal.prisma.hrm_platform_timelogs.findUniqueOrThrow({
//     where: { ... },
//     ...HrmPlatformTimelogTransformer.select(),
//   });
//   return await HrmPlatformTimelogTransformer.transform(updated);
// }
// ```
//--------------------------------------------------------------