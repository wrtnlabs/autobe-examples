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
  const employee = await MyGlobal.prisma.hrm_platform_employees.findFirst({
    where: {
      member: { id: props.member.id },
      deleted_at: null,
    },
  });
  if (employee === null) {
    throw new HttpException("Employee record not found", 404);
  }
  const timelog = await MyGlobal.prisma.hrm_platform_timelogs.findUniqueOrThrow(
    {
      where: { id: props.timelogId },
      include: {
        project: true,
      },
    },
  );
  if (timelog.employee_id !== employee.id) {
    throw new HttpException("Forbidden", 403);
  }
  if (timelog.deleted_at !== null) {
    throw new HttpException("Timelog is soft-deleted", 400);
  }
  if (timelog.project.status === "completed") {
    throw new HttpException("Cannot update timelog for completed project", 409);
  }
  const timesheetCheck =
    await MyGlobal.prisma.hrm_platform_timesheet_timelogs.findFirst({
      where: {
        hrm_platform_timelog_id: props.timelogId,
      },
      select: {
        id: true,
        hrm_platform_timesheet_id: true,
      },
    });
  if (timesheetCheck !== null) {
    const timesheet = await MyGlobal.prisma.hrm_platform_timesheets.findUnique({
      where: { id: timesheetCheck.hrm_platform_timesheet_id },
      select: { status: true },
    });
    if (timesheet !== null && timesheet.status !== "draft") {
      throw new HttpException(
        "Cannot update timelog in submitted or approved timesheet",
        409,
      );
    }
  }
  const updateData: Prisma.hrm_platform_timelogsUpdateInput = {};
  if (
    props.body.start_datetime !== undefined ||
    props.body.end_datetime !== undefined
  ) {
    const start = props.body.start_datetime ?? timelog.start_datetime;
    const end = props.body.end_datetime ?? timelog.end_datetime;
    const startMillis =
      typeof start === "string" ? Date.parse(start) : start.getTime();
    const endMillis = typeof end === "string" ? Date.parse(end) : end.getTime();
    if (endMillis < startMillis) {
      throw new HttpException("end_datetime must be >= start_datetime", 400);
    }
    const durationMinutes = Math.floor((endMillis - startMillis) / 60000);
    updateData.duration_minutes = durationMinutes;
    updateData.start_datetime = start;
    updateData.end_datetime = end;
  }
  if (props.body.description !== undefined) {
    updateData.description = props.body.description;
  }
  if (props.body.billable !== undefined) {
    updateData.billable = props.body.billable;
  }
  updateData.updated_at = new Date();
  await MyGlobal.prisma.hrm_platform_timelogs.update({
    where: { id: props.timelogId },
    data: updateData,
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