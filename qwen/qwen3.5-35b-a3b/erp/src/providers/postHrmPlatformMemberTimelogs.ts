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
import { HrmPlatformTimelogCollector } from "../collectors/HrmPlatformTimelogCollector";
import { MemberPayload } from "../decorators/payload/MemberPayload";
import { HrmPlatformTimelogTransformer } from "../transformers/HrmPlatformTimelogTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function postHrmPlatformMemberTimelogs(props: {
  member: MemberPayload;
  body: IHrmPlatformTimelog.ICreate;
}): Promise<IHrmPlatformTimelog> {
  // Parse datetime strings for validation (used only for comparison)
  const startDateTime = new Date(props.body.start_datetime);
  const endDateTime = new Date(props.body.end_datetime);
  const now = new Date();
  // Validate datetime constraints
  if (startDateTime > now) {
    throw new HttpException("start_datetime must be in the past", 400);
  }
  if (endDateTime <= startDateTime) {
    throw new HttpException("end_datetime must be after start_datetime", 400);
  }
  if (endDateTime > now) {
    throw new HttpException("end_datetime must be in the past", 400);
  }
  if (props.body.duration_minutes <= 0) {
    throw new HttpException("duration_minutes must be greater than 0", 400);
  }
  // Validate project exists and belongs to member's organization
  const project = await MyGlobal.prisma.hrm_platform_projects.findUniqueOrThrow(
    {
      where: { id: props.body.project_id },
      select: { id: true, organization_id: true },
    },
  );
  // Validate task exists and belongs to the project if provided
  if (props.body.task_id !== null) {
    const task = await MyGlobal.prisma.hrm_platform_tasks.findUniqueOrThrow({
      where: { id: props.body.task_id },
      select: { id: true, project_id: true },
    });
    if (task.project_id !== props.body.project_id) {
      throw new HttpException(
        "task_id must belong to the specified project",
        400,
      );
    }
  }
  // Validate employee belongs to the same organization as project
  const employee =
    await MyGlobal.prisma.hrm_platform_employees.findUniqueOrThrow({
      where: { id: props.body.employee_id },
      select: {
        id: true,
        hrm_platform_organization_id: true,
        is_pending: true,
      },
    });
  if (employee.hrm_platform_organization_id !== project.organization_id) {
    throw new HttpException(
      "employee must belong to the same organization as project",
      400,
    );
  }
  if (employee.is_pending === true) {
    throw new HttpException("Cannot create timelog for pending employee", 400);
  }
  // Check if member is allowed to create timelog for this employee
  if (employee.id !== props.member.id) {
    const memberSession =
      await MyGlobal.prisma.hrm_platform_member_sessions.findFirst({
        where: {
          id: props.member.session_id,
        },
      });
    if (memberSession === null) {
      throw new HttpException(
        "You do not have permission to create timelogs for other employees",
        403,
      );
    }
  }
  // Calculate week period (Monday to Sunday) based on start_datetime
  const startOfWeek = new Date(startDateTime);
  const dayOfWeek = startOfWeek.getUTCDay() || 7;
  startOfWeek.setUTCDate(startOfWeek.getUTCDate() - dayOfWeek + 1);
  startOfWeek.setUTCHours(0, 0, 0, 0);
  const endOfWeek = new Date(startOfWeek);
  endOfWeek.setUTCDate(endOfWeek.getUTCDate() + 6);
  endOfWeek.setUTCHours(23, 59, 59, 999);
  // Check for existing timesheet in this week period for the employee
  const existingTimesheet =
    await MyGlobal.prisma.hrm_platform_timesheets.findFirst({
      where: {
        employee: { id: employee.id },
        start_date: { lte: startOfWeek },
        end_date: { gte: startOfWeek },
      },
    });
  if (existingTimesheet !== null) {
    if (
      existingTimesheet.status === "submitted" ||
      existingTimesheet.status === "approved"
    ) {
      throw new HttpException(
        "Cannot add timelog to submitted or approved timesheet",
        400,
      );
    }
  }
  // Create timelog
  const record = await MyGlobal.prisma.hrm_platform_timelogs.create({
    data: await HrmPlatformTimelogCollector.collect({
      body: props.body,
    }),
    ...HrmPlatformTimelogTransformer.select(),
  });
  return await HrmPlatformTimelogTransformer.transform(record);
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
// export async function postHrmPlatformMemberTimelogs(props: {
//   member: MemberPayload;
//   body: IHrmPlatformTimelog.ICreate;
// }): Promise<IHrmPlatformTimelog> {
//   const record = await MyGlobal.prisma.hrm_platform_timelogs.create({
//     data: await HrmPlatformTimelogCollector.collect({
//       body: props.body,
//       ...
//     }),
//     ...HrmPlatformTimelogTransformer.select(),
//   });
//   return await HrmPlatformTimelogTransformer.transform(record);
// }
// ```
//--------------------------------------------------------------