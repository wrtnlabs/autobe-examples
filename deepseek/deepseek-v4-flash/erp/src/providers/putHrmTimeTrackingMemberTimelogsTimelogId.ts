import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IHrmTimeTrackingDepartment } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingDepartment";
import { IHrmTimeTrackingEmployee } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingEmployee";
import { IHrmTimeTrackingMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingMember";
import { IHrmTimeTrackingOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingOrganization";
import { IHrmTimeTrackingProject } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingProject";
import { IHrmTimeTrackingRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingRole";
import { IHrmTimeTrackingTask } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingTask";
import { IHrmTimeTrackingTimelog } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingTimelog";
import { IHrmTimeTrackingTimesheet } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingTimesheet";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { MemberPayload } from "../decorators/payload/MemberPayload";
import { HrmTimeTrackingTimelogTransformer } from "../transformers/HrmTimeTrackingTimelogTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function putHrmTimeTrackingMemberTimelogsTimelogId(props: {
  member: MemberPayload;
  timelogId: string & tags.Format<"uuid">;
  body: IHrmTimeTrackingTimelog.IUpdate;
}): Promise<IHrmTimeTrackingTimelog> {
  // Step 1: Find timelog and ensure not soft-deleted
  const timelog =
    await MyGlobal.prisma.hrm_time_tracking_timelogs.findUniqueOrThrow({
      where: { id: props.timelogId },
      select: {
        id: true,
        hrm_time_tracking_employee_id: true,
        hrm_time_tracking_project_id: true,
        hrm_time_tracking_task_id: true,
        hrm_time_tracking_timesheet_id: true,
        deleted_at: true,
      },
    });
  if (timelog.deleted_at !== null) {
    throw new HttpException("Timelog is deleted", 404);
  }
  // Step 2: Find the timelog's employee to get organization context
  const timelogEmployee =
    await MyGlobal.prisma.hrm_time_tracking_employees.findUniqueOrThrow({
      where: { id: timelog.hrm_time_tracking_employee_id },
      select: {
        hrm_time_tracking_organization_id: true,
      },
    });
  // Find the requesting member's employee record in the same organization
  const requestingEmployee =
    await MyGlobal.prisma.hrm_time_tracking_employees.findFirst({
      where: {
        hrm_time_tracking_member_id: props.member.id,
        hrm_time_tracking_organization_id:
          timelogEmployee.hrm_time_tracking_organization_id,
        deleted_at: null,
      },
      select: {
        id: true,
        hrm_time_tracking_role_id: true,
      },
    });
  if (requestingEmployee === null) {
    throw new HttpException("Forbidden", 403);
  }
  // Check if the requesting member's role has time:manage permission
  const timeManagePermission =
    await MyGlobal.prisma.hrm_time_tracking_role_permissions.findFirst({
      where: {
        hrm_time_tracking_role_id: requestingEmployee.hrm_time_tracking_role_id,
        permission_code: "time:manage",
        deleted_at: null,
      },
      select: { id: true },
    });
  const hasTimeManage: boolean = timeManagePermission !== null;
  // If no time:manage, verify the timelog belongs to the requesting employee
  if (
    hasTimeManage === false &&
    timelog.hrm_time_tracking_employee_id !== requestingEmployee.id
  ) {
    throw new HttpException("Forbidden", 403);
  }
  // Step 3: Check timesheet lock
  if (timelog.hrm_time_tracking_timesheet_id !== null) {
    const timesheet =
      await MyGlobal.prisma.hrm_time_tracking_timesheets.findUniqueOrThrow({
        where: { id: timelog.hrm_time_tracking_timesheet_id },
        select: { status: true },
      });
    if (timesheet.status === "submitted" || timesheet.status === "approved") {
      throw new HttpException(
        "Cannot modify a timelog in a submitted or approved timesheet",
        422,
      );
    }
  }
  // Step 4: Build update data — typed object, no `as` assertions
  const updateData: Prisma.hrm_time_tracking_timelogsUpdateInput = {
    updated_at: new Date().toISOString(),
  };
  if (props.body.date !== undefined) {
    updateData.date = props.body.date;
  }
  if (props.body.duration_minutes !== undefined) {
    updateData.duration_minutes = props.body.duration_minutes;
  }
  if (props.body.description !== undefined) {
    updateData.description = props.body.description;
  }
  if (props.body.billable !== undefined) {
    updateData.billable = props.body.billable;
  }
  // Handle project change
  const projectId: string | undefined = props.body.project_id;
  if (projectId !== undefined) {
    const project =
      await MyGlobal.prisma.hrm_time_tracking_projects.findUniqueOrThrow({
        where: { id: projectId },
        select: { status: true },
      });
    if (project.status !== "active") {
      throw new HttpException(
        "Cannot reassign timelog to a non-active project",
        422,
      );
    }
    const membership =
      await MyGlobal.prisma.hrm_time_tracking_project_members.findFirst({
        where: {
          hrm_time_tracking_project_id: projectId,
          hrm_time_tracking_employee_id: timelog.hrm_time_tracking_employee_id,
          deleted_at: null,
        },
        select: { id: true },
      });
    if (membership === null) {
      throw new HttpException(
        "Employee is not a member of the target project",
        422,
      );
    }
    updateData.project = { connect: { id: projectId } };
  }
  // Handle task change
  if (props.body.task_id !== undefined) {
    if (props.body.task_id === null) {
      updateData.task = { disconnect: true };
    } else {
      const effectiveProjectId: string =
        projectId ?? timelog.hrm_time_tracking_project_id;
      const task =
        await MyGlobal.prisma.hrm_time_tracking_tasks.findUniqueOrThrow({
          where: { id: props.body.task_id },
          select: { hrm_time_tracking_project_id: true },
        });
      if (task.hrm_time_tracking_project_id !== effectiveProjectId) {
        throw new HttpException(
          "Task must belong to the same project as the timelog",
          422,
        );
      }
      updateData.task = { connect: { id: props.body.task_id } };
    }
  }
  // Step 5: Apply the update
  await MyGlobal.prisma.hrm_time_tracking_timelogs.update({
    where: { id: props.timelogId },
    data: updateData,
  });
  // Step 6: Return the fully updated timelog using the transformer
  const updated =
    await MyGlobal.prisma.hrm_time_tracking_timelogs.findUniqueOrThrow({
      where: { id: props.timelogId },
      ...HrmTimeTrackingTimelogTransformer.select(),
    });
  return await HrmTimeTrackingTimelogTransformer.transform(updated);
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
// import { IHrmTimeTrackingTimelog } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingTimelog";
// import { IHrmTimeTrackingEmployee } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingEmployee";
// import { IHrmTimeTrackingMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingMember";
// import { IHrmTimeTrackingRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingRole";
// import { IHrmTimeTrackingOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingOrganization";
// import { IHrmTimeTrackingDepartment } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingDepartment";
// import { IHrmTimeTrackingProject } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingProject";
// import { IHrmTimeTrackingTask } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingTask";
// import { IHrmTimeTrackingTimesheet } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingTimesheet";
// 
// // DON'T CHANGE FUNCTION NAME AND PARAMETERS,
// // ONLY YOU HAVE TO WRITE THIS FUNCTION BODY, AND USE IMPORTED.
// export async function putHrmTimeTrackingMemberTimelogsTimelogId(props: {
//   member: MemberPayload;
//   timelogId: string & tags.Format<"uuid">;
//   body: IHrmTimeTrackingTimelog.IUpdate;
// }): Promise<IHrmTimeTrackingTimelog> {
//   await MyGlobal.prisma.hrm_time_tracking_timelogs.update({
//     where: { ... },
//     data: { ... },
//   });
//   const updated = await MyGlobal.prisma.hrm_time_tracking_timelogs.findUniqueOrThrow({
//     where: { ... },
//     ...HrmTimeTrackingTimelogTransformer.select(),
//   });
//   return await HrmTimeTrackingTimelogTransformer.transform(updated);
// }
// ```
//--------------------------------------------------------------