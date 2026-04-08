import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IErpHrmDepartment } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmDepartment";
import { IErpHrmEmployee } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmEmployee";
import { IErpHrmMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmMember";
import { IErpHrmOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmOrganization";
import { IErpHrmProject } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmProject";
import { IErpHrmRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmRole";
import { IErpHrmTask } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTask";
import { IErpHrmTimelog } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimelog";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { MemberPayload } from "../decorators/payload/MemberPayload";
import { ErpHrmTimelogTransformer } from "../transformers/ErpHrmTimelogTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function putErpHrmMemberTimelogsTimelogId(props: {
  member: MemberPayload;
  timelogId: string & tags.Format<"uuid">;
  body: IErpHrmTimelog.IUpdate;
}): Promise<IErpHrmTimelog> {
  // 1. Fetch the timelog with timesheet relationships to check if it's in an approved timesheet
  const timelog = await MyGlobal.prisma.erp_hrm_timelogs.findUnique({
    where: { id: props.timelogId },
    select: {
      id: true,
      erp_hrm_employee_id: true,
      erp_hrm_project_id: true,
      date: true,
      duration_minutes: true,
      description: true,
      billable: true,
      timelogTimesheets: {
        select: {
          id: true,
          timesheet: {
            select: {
              id: true,
              status: true,
            },
          },
        },
      },
    },
  });
  if (timelog === null) {
    throw new HttpException("Timelog not found", 404);
  }
  // 2. Get the employee's record linked to the authenticated member
  const employee = await MyGlobal.prisma.erp_hrm_employees.findFirst({
    where: {
      erp_hrm_member_id: props.member.id,
      deleted_at: null,
    },
    select: {
      id: true,
      status: true,
      erp_hrm_role_id: true,
    },
  });
  if (employee === null) {
    throw new HttpException("Employee not found", 404);
  }
  // 3. Check if the employee has time:manage permission
  const timeManagePermission =
    await MyGlobal.prisma.erp_hrm_role_permissions.findFirst({
      where: {
        erp_hrm_role_id: employee.erp_hrm_role_id,
        permission: "time:manage",
      },
    });
  const isTimeManager = timeManagePermission !== null;
  // 4. Authorization check: user must own the timelog or have time:manage permission
  const isOwner = timelog.erp_hrm_employee_id === employee.id;
  if (!isOwner && !isTimeManager) {
    throw new HttpException("Forbidden", 403);
  }
  // 5. If user is owner (not time manager), check if timelog is in an approved timesheet
  if (!isTimeManager) {
    const isInApprovedTimesheet = timelog.timelogTimesheets.some(
      (tt) => tt.timesheet.status === "approved",
    );
    if (isInApprovedTimesheet) {
      throw new HttpException(
        "Cannot update timelog in an approved timesheet",
        403,
      );
    }
  }
  // 6. Validate and prepare update data
  const updateData: {
    date?: string;
    duration_minutes?: number;
    description?: string | null;
    billable?: boolean;
    erp_hrm_project_id?: string;
    erp_hrm_task_id?: string | null;
    updated_at: string;
  } = {
    updated_at: new Date().toISOString(),
  };
  // Validate and set date
  if (props.body.date !== undefined) {
    const inputDate = new Date(props.body.date);
    const today = new Date();
    today.setHours(23, 59, 59, 999);
    if (inputDate > today) {
      throw new HttpException("Date cannot be in the future", 400);
    }
    updateData.date = props.body.date;
  }
  // Validate and set duration_minutes
  if (props.body.durationMinutes !== undefined) {
    if (props.body.durationMinutes <= 0) {
      throw new HttpException(
        "Duration must be a positive integer greater than zero",
        400,
      );
    }
    updateData.duration_minutes = props.body.durationMinutes;
  }
  // Set description (can be null)
  if (props.body.description !== undefined) {
    updateData.description = props.body.description;
  }
  // Set billable flag
  if (props.body.billable !== undefined) {
    updateData.billable = props.body.billable;
  }
  // Validate and set erp_hrm_project_id
  if (props.body.erpHrmProjectId !== undefined) {
    // Check if project exists and is active
    const project = await MyGlobal.prisma.erp_hrm_projects.findUnique({
      where: { id: props.body.erpHrmProjectId },
      select: { id: true, status: true },
    });
    if (project === null) {
      throw new HttpException("Project not found", 404);
    }
    if (project.status !== "active") {
      throw new HttpException("Project is not active", 400);
    }
    // Check if employee is a member of the project
    const projectMembership =
      await MyGlobal.prisma.erp_hrm_project_members.findUnique({
        where: {
          erp_hrm_employee_id_erp_hrm_project_id: {
            erp_hrm_employee_id: employee.id,
            erp_hrm_project_id: props.body.erpHrmProjectId,
          },
        },
        select: { id: true },
      });
    if (projectMembership === null) {
      throw new HttpException("You are not a member of this project", 400);
    }
    updateData.erp_hrm_project_id = props.body.erpHrmProjectId;
  }
  // Validate and set erp_hrm_task_id
  if (props.body.erpHrmTaskId !== undefined) {
    // If setting task to null, allow it
    if (props.body.erpHrmTaskId === null) {
      updateData.erp_hrm_task_id = null;
    } else {
      // Verify task exists and belongs to the specified project
      const targetProjectId =
        props.body.erpHrmProjectId ?? timelog.erp_hrm_project_id;
      const task = await MyGlobal.prisma.erp_hrm_tasks.findUnique({
        where: { id: props.body.erpHrmTaskId },
        select: { id: true, erp_hrm_project_id: true },
      });
      if (task === null) {
        throw new HttpException("Task not found", 404);
      }
      if (task.erp_hrm_project_id !== targetProjectId) {
        throw new HttpException(
          "Task does not belong to the specified project",
          400,
        );
      }
      updateData.erp_hrm_task_id = props.body.erpHrmTaskId;
    }
  }
  // 7. Perform the update
  await MyGlobal.prisma.erp_hrm_timelogs.update({
    where: { id: props.timelogId },
    data: updateData,
  });
  // 8. Fetch the updated timelog with full details using transformer
  const updatedTimelog =
    await MyGlobal.prisma.erp_hrm_timelogs.findUniqueOrThrow({
      where: { id: props.timelogId },
      ...ErpHrmTimelogTransformer.select(),
    });
  // 9. Transform and return the response
  return await ErpHrmTimelogTransformer.transform(updatedTimelog);
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
// import { IErpHrmTimelog } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimelog";
// import { IErpHrmEmployee } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmEmployee";
// import { IErpHrmMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmMember";
// import { IErpHrmRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmRole";
// import { IErpHrmOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmOrganization";
// import { IErpHrmDepartment } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmDepartment";
// import { IErpHrmProject } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmProject";
// import { IErpHrmTask } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTask";
// 
// // DON'T CHANGE FUNCTION NAME AND PARAMETERS,
// // ONLY YOU HAVE TO WRITE THIS FUNCTION BODY, AND USE IMPORTED.
// export async function putErpHrmMemberTimelogsTimelogId(props: {
//   member: MemberPayload;
//   timelogId: string & tags.Format<"uuid">;
//   body: IErpHrmTimelog.IUpdate;
// }): Promise<IErpHrmTimelog> {
//   await MyGlobal.prisma.erp_hrm_timelogs.update({
//     where: { ... },
//     data: { ... },
//   });
//   const updated = await MyGlobal.prisma.erp_hrm_timelogs.findUniqueOrThrow({
//     where: { ... },
//     ...ErpHrmTimelogTransformer.select(),
//   });
//   return await ErpHrmTimelogTransformer.transform(updated);
// }
// ```
//--------------------------------------------------------------