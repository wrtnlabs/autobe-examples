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
import { AdminPayload } from "../decorators/payload/AdminPayload";
import { ErpHrmTimelogTransformer } from "../transformers/ErpHrmTimelogTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function putErpHrmAdminMembersMemberIdTimelogsTimelogId(props: {
  admin: AdminPayload;
  memberId: string & tags.Format<"uuid">;
  timelogId: string & tags.Format<"uuid">;
  body: IErpHrmTimelog.IUpdate;
}): Promise<IErpHrmTimelog> {
  // 1. Find existing timelog with employee info
  const existingTimelog =
    await MyGlobal.prisma.erp_hrm_timelogs.findUniqueOrThrow({
      where: { id: props.timelogId },
      select: {
        id: true,
        erp_hrm_employee_id: true,
        erp_hrm_project_id: true,
        erp_hrm_task_id: true,
        date: true,
        duration_minutes: true,
        description: true,
        billable: true,
        created_at: true,
        updated_at: true,
        employee: {
          select: {
            id: true,
            erp_hrm_member_id: true,
            erp_hrm_organization_id: true,
          },
        },
      },
    });
  // 2. Verify timelog belongs to specified member
  if (existingTimelog.erp_hrm_employee_id !== props.memberId) {
    throw new HttpException("Timelog not found", 404);
  }
  // 3. Validate date is not in future using ISO string comparison
  if (props.body.date !== undefined) {
    const updateDateStr = props.body.date;
    const now = new Date();
    const todayStr = now.toISOString().split("T")[0];
    const updateDateOnly = updateDateStr.split("T")[0];
    if (updateDateOnly > todayStr) {
      throw new HttpException("Date cannot be in the future", 400);
    }
  }
  // 4. Validate project assignment (if changing project)
  const projectId =
    props.body.erpHrmProjectId ?? existingTimelog.erp_hrm_project_id;
  if (
    props.body.erpHrmProjectId !== undefined &&
    props.body.erpHrmProjectId !== existingTimelog.erp_hrm_project_id
  ) {
    // Verify new project exists and is active
    const newProject = await MyGlobal.prisma.erp_hrm_projects.findUnique({
      where: { id: props.body.erpHrmProjectId },
      select: { id: true, status: true },
    });
    if (!newProject) {
      throw new HttpException("Project not found", 404);
    }
    if (newProject.status !== "active") {
      throw new HttpException(
        "Cannot assign timelog to archived or completed project",
        400,
      );
    }
    // Verify employee is a member of the project
    const membership = await MyGlobal.prisma.erp_hrm_project_members.findFirst({
      where: {
        erp_hrm_project_id: props.body.erpHrmProjectId,
        erp_hrm_employee_id: props.memberId,
      },
      select: { id: true },
    });
    if (!membership) {
      throw new HttpException("Employee is not a member of this project", 400);
    }
  }
  // 5. Validate task belongs to project (if changing task)
  if (
    props.body.erpHrmTaskId !== undefined &&
    props.body.erpHrmTaskId !== existingTimelog.erp_hrm_task_id
  ) {
    if (props.body.erpHrmTaskId !== null) {
      const task = await MyGlobal.prisma.erp_hrm_tasks.findUnique({
        where: { id: props.body.erpHrmTaskId },
        select: { id: true, erp_hrm_project_id: true },
      });
      if (!task) {
        throw new HttpException("Task not found", 404);
      }
      if (task.erp_hrm_project_id !== projectId) {
        throw new HttpException(
          "Task does not belong to the specified project",
          400,
        );
      }
    }
  }
  // 6. Build partial update data using relation fields with connect/disconnect
  const updateData: Prisma.erp_hrm_timelogsUpdateInput = {
    billable: props.body.billable,
    date: props.body.date ? new Date(props.body.date) : undefined,
    description: props.body.description,
    duration_minutes: props.body.durationMinutes,
    updated_at: new Date(),
  };
  // Connect/disconnect project relation if changed
  if (
    props.body.erpHrmProjectId !== undefined &&
    props.body.erpHrmProjectId !== existingTimelog.erp_hrm_project_id
  ) {
    updateData.project = { connect: { id: props.body.erpHrmProjectId } };
  }
  // Connect/disconnect task relation if changed
  if (
    props.body.erpHrmTaskId !== undefined &&
    props.body.erpHrmTaskId !== existingTimelog.erp_hrm_task_id
  ) {
    if (props.body.erpHrmTaskId === null) {
      updateData.task = { disconnect: true };
    } else {
      updateData.task = { connect: { id: props.body.erpHrmTaskId } };
    }
  }
  // 7. Update the timelog
  await MyGlobal.prisma.erp_hrm_timelogs.update({
    where: { id: props.timelogId },
    data: updateData,
  });
  // 8. Fetch updated timelog with full relations for response
  const updatedTimelog =
    await MyGlobal.prisma.erp_hrm_timelogs.findUniqueOrThrow({
      where: { id: props.timelogId },
      ...ErpHrmTimelogTransformer.select(),
    });
  // 9. Transform and return response
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
// export async function putErpHrmAdminMembersMemberIdTimelogsTimelogId(props: {
//   admin: AdminPayload;
//   memberId: string & tags.Format<"uuid">;
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