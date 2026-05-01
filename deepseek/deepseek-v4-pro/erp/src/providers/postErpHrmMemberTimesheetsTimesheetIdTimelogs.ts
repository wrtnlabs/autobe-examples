import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IErpHrmDepartment } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmDepartment";
import { IErpHrmEmployee } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmEmployee";
import { IErpHrmMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmMember";
import { IErpHrmProject } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmProject";
import { IErpHrmRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmRole";
import { IErpHrmTask } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTask";
import { IErpHrmTimelog } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimelog";
import { IErpHrmTimesheet } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimesheet";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { ErpHrmTimelogCollector } from "../collectors/ErpHrmTimelogCollector";
import { MemberPayload } from "../decorators/payload/MemberPayload";
import { ErpHrmTimelogTransformer } from "../transformers/ErpHrmTimelogTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function postErpHrmMemberTimesheetsTimesheetIdTimelogs(props: {
  member: MemberPayload;
  timesheetId: string & tags.Format<"uuid">;
  body: IErpHrmTimelog.ICreate;
}): Promise<IErpHrmTimelog> {
  const timesheet = await MyGlobal.prisma.erp_hrm_timesheets.findUniqueOrThrow({
    where: { id: props.timesheetId, deleted_at: null },
    select: {
      id: true,
      status: true,
      week_start_date: true,
      week_end_date: true,
      employee: {
        select: {
          id: true,
          status: true,
          erp_hrm_organization_id: true,
        },
      },
    },
  });
  if (timesheet.status !== "draft") {
    throw new HttpException(
      "Timelogs can only be added to draft timesheets",
      400,
    );
  }
  const memberEmployee = await MyGlobal.prisma.erp_hrm_employees.findFirst({
    where: {
      erp_hrm_member_id: props.member.id,
      erp_hrm_organization_id: timesheet.employee.erp_hrm_organization_id,
      deleted_at: null,
    },
    select: {
      id: true,
      status: true,
      role: {
        select: {
          name: true,
          is_builtin: true,
          rolePermissions: {
            where: {
              permission: { key: "time:manage" },
            },
            select: { id: true },
          },
        },
      },
    },
  });
  if (memberEmployee === null) {
    throw new HttpException(
      "Employee record not found in this organization",
      403,
    );
  }
  const hasTimeManage: boolean =
    (memberEmployee.role.is_builtin === true &&
      (memberEmployee.role.name === "Owner" ||
        memberEmployee.role.name === "Manager")) ||
    memberEmployee.role.rolePermissions.length > 0;
  let targetEmployeeId: string;
  if (hasTimeManage === false) {
    if (
      props.body.employee_id !== undefined &&
      props.body.employee_id !== memberEmployee.id
    ) {
      throw new HttpException("You can only log time for yourself", 403);
    }
    if (memberEmployee.status !== "active") {
      throw new HttpException("Deactivated employees cannot log time", 403);
    }
    targetEmployeeId = memberEmployee.id;
  } else {
    if (timesheet.employee.status !== "active") {
      throw new HttpException(
        "The timesheet owner is deactivated and cannot receive new timelogs",
        400,
      );
    }
    targetEmployeeId = timesheet.employee.id;
  }
  const project = await MyGlobal.prisma.erp_hrm_projects.findUniqueOrThrow({
    where: { id: props.body.project_id, deleted_at: null },
    select: {
      id: true,
      status: true,
      organization_id: true,
    },
  });
  if (project.status !== "active") {
    throw new HttpException(
      "Timelogs can only be logged against active projects",
      400,
    );
  }
  if (project.organization_id !== timesheet.employee.erp_hrm_organization_id) {
    throw new HttpException(
      "Project does not belong to the same organization",
      400,
    );
  }
  const projectMember = await MyGlobal.prisma.erp_hrm_project_members.findFirst(
    {
      where: {
        erp_hrm_employee_id: targetEmployeeId,
        erp_hrm_project_id: props.body.project_id,
        deleted_at: null,
      },
      select: { id: true },
    },
  );
  if (projectMember === null) {
    throw new HttpException("Employee is not a member of this project", 403);
  }
  if (props.body.task_id !== undefined) {
    const task = await MyGlobal.prisma.erp_hrm_tasks.findUniqueOrThrow({
      where: { id: props.body.task_id },
      select: {
        id: true,
        erp_hrm_project_id: true,
        deleted_at: true,
      },
    });
    if (task.deleted_at !== null) {
      throw new HttpException("The specified task has been deleted", 400);
    }
    if (task.erp_hrm_project_id !== props.body.project_id) {
      throw new HttpException(
        "Task does not belong to the specified project",
        400,
      );
    }
  }
  const weekStartStr: string = timesheet.week_start_date
    .toISOString()
    .substring(0, 10);
  const weekEndStr: string = timesheet.week_end_date
    .toISOString()
    .substring(0, 10);
  if (props.body.date < weekStartStr || props.body.date > weekEndStr) {
    throw new HttpException(
      "Timelog date must fall within the timesheet's week range",
      400,
    );
  }
  const collectorBody: IErpHrmTimelog.ICreate =
    hasTimeManage === true
      ? {
          project_id: props.body.project_id,
          task_id: props.body.task_id,
          employee_id: undefined,
          date: props.body.date,
          duration_minutes: props.body.duration_minutes,
          description: props.body.description,
          billable: props.body.billable,
        }
      : props.body;
  const collectorData = await ErpHrmTimelogCollector.collect({
    body: collectorBody,
    erpHrmEmployees: { id: targetEmployeeId },
    erpHrmMemberSessions: { id: props.member.session_id },
  });
  const record = await MyGlobal.prisma.erp_hrm_timelogs.create({
    data: {
      ...collectorData,
      timesheet: { connect: { id: props.timesheetId } },
    },
    ...ErpHrmTimelogTransformer.select(),
  });
  return await ErpHrmTimelogTransformer.transform(record);
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
// import { IErpHrmDepartment } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmDepartment";
// import { IErpHrmProject } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmProject";
// import { IErpHrmTask } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTask";
// import { IErpHrmTimesheet } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimesheet";
// 
// // DON'T CHANGE FUNCTION NAME AND PARAMETERS,
// // ONLY YOU HAVE TO WRITE THIS FUNCTION BODY, AND USE IMPORTED.
// export async function postErpHrmMemberTimesheetsTimesheetIdTimelogs(props: {
//   member: MemberPayload;
//   timesheetId: string & tags.Format<"uuid">;
//   body: IErpHrmTimelog.ICreate;
// }): Promise<IErpHrmTimelog> {
//   const record = await MyGlobal.prisma.erp_hrm_timelogs.create({
//     data: await ErpHrmTimelogCollector.collect({
//       body: props.body,
//       ...
//     }),
//     ...ErpHrmTimelogTransformer.select(),
//   });
//   return await ErpHrmTimelogTransformer.transform(record);
// }
// ```
//--------------------------------------------------------------