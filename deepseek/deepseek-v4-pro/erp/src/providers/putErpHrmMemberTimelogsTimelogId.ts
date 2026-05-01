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
import { MemberPayload } from "../decorators/payload/MemberPayload";
import { ErpHrmTimelogTransformer } from "../transformers/ErpHrmTimelogTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function putErpHrmMemberTimelogsTimelogId(props: {
  member: MemberPayload;
  timelogId: string & tags.Format<"uuid">;
  body: IErpHrmTimelog.IUpdate;
}): Promise<IErpHrmTimelog> {
  // ── 1. Lookup timelog ──
  const timelog = await MyGlobal.prisma.erp_hrm_timelogs.findFirst({
    where: {
      id: props.timelogId,
      deleted_at: null,
    },
    select: {
      id: true,
      employee_id: true,
      timesheet_id: true,
      employee: {
        select: {
          id: true,
          erp_hrm_organization_id: true,
        },
      },
    },
  });
  if (timelog === null) {
    throw new HttpException("Timelog not found", 404);
  }
  const organizationId = timelog.employee.erp_hrm_organization_id;
  // ── 2. Resolve requesting employee in same org ──
  const requestingEmployee = await MyGlobal.prisma.erp_hrm_employees.findFirst({
    where: {
      erp_hrm_member_id: props.member.id,
      erp_hrm_organization_id: organizationId,
      deleted_at: null,
    },
    select: {
      id: true,
      role: {
        select: {
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
  if (requestingEmployee === null) {
    throw new HttpException("Forbidden", 403);
  }
  // ── 3. Authorize: owner OR time:manage ──
  const isOwner = timelog.employee_id === requestingEmployee.id;
  const hasTimeManage = requestingEmployee.role.rolePermissions.length > 0;
  if (!isOwner && !hasTimeManage) {
    throw new HttpException("Forbidden", 403);
  }
  // ── 4. Approved-timesheet lock ──
  if (timelog.timesheet_id !== null) {
    const timesheet = await MyGlobal.prisma.erp_hrm_timesheets.findUnique({
      where: { id: timelog.timesheet_id },
      select: { status: true },
    });
    if (timesheet !== null && timesheet.status === "approved") {
      throw new HttpException(
        "Timelog is part of an approved timesheet and cannot be modified",
        409,
      );
    }
  }
  // ── 5. Validate target project ──
  const project = await MyGlobal.prisma.erp_hrm_projects.findFirst({
    where: {
      id: props.body.project_id,
      organization_id: organizationId,
      deleted_at: null,
    },
    select: { id: true, status: true },
  });
  if (project === null) {
    throw new HttpException("Project not found", 404);
  }
  if (project.status !== "active") {
    throw new HttpException(
      "Project must be active to accept timelog updates",
      422,
    );
  }
  // ── 6. Membership check: timelog owner must be active member ──
  const membership = await MyGlobal.prisma.erp_hrm_project_members.findFirst({
    where: {
      erp_hrm_employee_id: timelog.employee_id,
      erp_hrm_project_id: props.body.project_id,
      deleted_at: null,
    },
  });
  if (membership === null) {
    throw new HttpException(
      "Timelog owner is not a member of the target project",
      422,
    );
  }
  // ── 7. Task integrity: task must belong to selected project ──
  if (props.body.task_id !== undefined && props.body.task_id !== null) {
    const task = await MyGlobal.prisma.erp_hrm_tasks.findFirst({
      where: {
        id: props.body.task_id,
        erp_hrm_project_id: props.body.project_id,
        deleted_at: null,
      },
    });
    if (task === null) {
      throw new HttpException(
        "Task does not belong to the selected project",
        422,
      );
    }
  }
  // ── 8. Update ──
  await MyGlobal.prisma.erp_hrm_timelogs.update({
    where: { id: props.timelogId },
    data: {
      date: props.body.date,
      duration_minutes: props.body.duration_minutes,
      project_id: props.body.project_id,
      ...(props.body.task_id !== undefined && {
        task_id: props.body.task_id,
      }),
      ...(props.body.description !== undefined && {
        description: props.body.description,
      }),
      billable: props.body.billable,
      updated_at: new Date().toISOString(),
    },
  });
  // ── 9. Return transformed result ──
  const updated = await MyGlobal.prisma.erp_hrm_timelogs.findUniqueOrThrow({
    where: { id: props.timelogId },
    ...ErpHrmTimelogTransformer.select(),
  });
  return await ErpHrmTimelogTransformer.transform(updated);
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