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
  const {
    employee_id,
    project_id,
    task_id,
    start_datetime,
    end_datetime,
    duration_minutes,
    billable,
  } = props.body;
  const member_id: string & tags.Format<"uuid"> = props.member.id;
  // Validate datetime range - ISO strings can be compared lexicographically
  const now: string & tags.Format<"date-time"> = toISOStringSafe(new Date());
  if (start_datetime >= now) {
    throw new HttpException("start_datetime must be in the past", 400);
  }
  if (end_datetime >= now) {
    throw new HttpException("end_datetime must be in the past", 400);
  }
  if (end_datetime <= start_datetime) {
    throw new HttpException("end_datetime must be after start_datetime", 400);
  }
  if (duration_minutes <= 0) {
    throw new HttpException("duration_minutes must be greater than 0", 400);
  }
  // Verify employee exists with full organization and permissions
  const employeeRaw =
    await MyGlobal.prisma.hrm_platform_employees.findUniqueOrThrow({
      where: { id: employee_id },
      include: {
        department: true,
        organization: true,
        member: true,
        role: {
          include: {
            organization: true,
            permissions: true,
          },
        },
        contracts: true,
        projectMemberships: true,
        assignedTasks: true,
        timers: true,
        timelogs: true,
        timesheets: true,
      },
    });
  // Check for time:manage permission
  const hasTimeManagePermission: boolean = employeeRaw.role.permissions.some(
    (permission: { code: string }) => permission.code === "time:manage",
  );
  // Verify employee's member matches authenticated member or user has time:manage permission
  if (employeeRaw.member.id !== member_id && !hasTimeManagePermission) {
    throw new HttpException("Forbidden", 403);
  }
  // Verify project exists and belongs to same organization as employee
  const projectRaw =
    await MyGlobal.prisma.hrm_platform_projects.findUniqueOrThrow({
      where: { id: project_id },
      include: {
        tasks: true,
        timelogs: true,
        timers: true,
        memberships: true,
        organization: {
          include: {
            owner: true,
          },
        },
      },
    });
  if (projectRaw.organization.id !== employeeRaw.organization.id) {
    throw new HttpException(
      "Project must belong to the same organization as employee",
      400,
    );
  }
  // If task is provided, verify it belongs to the project
  if (task_id !== undefined && task_id !== null) {
    const taskRaw = await MyGlobal.prisma.hrm_platform_tasks.findUniqueOrThrow({
      where: { id: task_id },
      select: {
        id: true,
        project_id: true,
      },
    });
    if (taskRaw.project_id !== project_id) {
      throw new HttpException("Task must belong to the specified project", 400);
    }
  }
  // Check timesheet status for the week period - find timesheets that contain this date range
  const submittedTimesheet =
    await MyGlobal.prisma.hrm_platform_timesheets.findFirst({
      where: {
        hrm_platform_employee_id: employee_id,
        start_date: { lte: new Date(start_datetime) },
        end_date: { gte: new Date(end_datetime) },
        status: {
          in: ["submitted", "approved"] as const,
        },
      },
    });
  if (submittedTimesheet !== null) {
    throw new HttpException(
      "Cannot add timelog to submitted or approved timesheet",
      400,
    );
  }
  // Create timelog using collector and transformer
  const createdTimelog = await MyGlobal.prisma.hrm_platform_timelogs.create({
    data: await HrmPlatformTimelogCollector.collect({
      body: props.body,
    }),
    ...HrmPlatformTimelogTransformer.select(),
  });
  return await HrmPlatformTimelogTransformer.transform(createdTimelog);
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