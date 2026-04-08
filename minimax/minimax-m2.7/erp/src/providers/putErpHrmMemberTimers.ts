import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IErpHrmDepartment } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmDepartment";
import { IErpHrmEmployee } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmEmployee";
import { IErpHrmMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmMember";
import { IErpHrmOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmOrganization";
import { IErpHrmProject } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmProject";
import { IErpHrmRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmRole";
import { IErpHrmTask } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTask";
import { IErpHrmTimer } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimer";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { MemberPayload } from "../decorators/payload/MemberPayload";
import { ErpHrmTimerTransformer } from "../transformers/ErpHrmTimerTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function putErpHrmMemberTimers(props: {
  member: MemberPayload;
  body: IErpHrmTimer.IUpdate;
}): Promise<IErpHrmTimer> {
  // Get employee from member session
  const employee = await MyGlobal.prisma.erp_hrm_employees.findFirst({
    where: {
      erp_hrm_member_id: props.member.id,
      deleted_at: null,
    },
    select: {
      id: true,
      status: true,
    },
  });
  if (!employee) {
    throw new HttpException("Employee not found", 404);
  }
  if (employee.status === "deactivated") {
    throw new HttpException("Deactivated employees cannot update timers", 403);
  }
  // Find the active timer for this employee
  const timer = await MyGlobal.prisma.erp_hrm_timers.findUnique({
    where: {
      erp_hrm_employee_id: employee.id,
    },
    select: {
      id: true,
      erp_hrm_task_id: true,
      erp_hrm_project_id: true,
    },
  });
  if (!timer) {
    throw new HttpException("No running timer to update", 404);
  }
  const newProjectId = props.body.project_id ?? timer.erp_hrm_project_id;
  const oldTaskId = timer.erp_hrm_task_id;
  // Validate project_id if provided - check employee is assigned to project
  if (props.body.project_id) {
    const projectMembership =
      await MyGlobal.prisma.erp_hrm_project_members.findFirst({
        where: {
          erp_hrm_employee_id: employee.id,
          erp_hrm_project_id: props.body.project_id,
        },
        select: {
          id: true,
        },
      });
    if (!projectMembership) {
      throw new HttpException("Project is not assigned to employee", 400);
    }
  }
  // Validate task_id if provided - verify task belongs to selected project
  if (props.body.task_id) {
    const task = await MyGlobal.prisma.erp_hrm_tasks.findFirst({
      where: {
        id: props.body.task_id,
        erp_hrm_project_id: newProjectId,
      },
      select: {
        id: true,
      },
    });
    if (!task) {
      throw new HttpException(
        "Task does not belong to the selected project",
        400,
      );
    }
  }
  // When changing project, clear task_id if old task doesn't belong to new project
  let shouldClearTaskId = false;
  if (props.body.project_id && oldTaskId) {
    const oldTaskBelongsToNewProject =
      await MyGlobal.prisma.erp_hrm_tasks.findFirst({
        where: {
          id: oldTaskId,
          erp_hrm_project_id: props.body.project_id,
        },
        select: {
          id: true,
        },
      });
    if (!oldTaskBelongsToNewProject) {
      shouldClearTaskId = true;
    }
  }
  // Build update data - only include provided fields
  const updateData: Record<string, any> = {
    updated_at: new Date(),
  };
  if (props.body.description !== undefined) {
    updateData.description = props.body.description;
  }
  if (props.body.project_id !== undefined) {
    updateData.erp_hrm_project_id = props.body.project_id;
  }
  if (props.body.task_id !== undefined) {
    updateData.erp_hrm_task_id = props.body.task_id;
  } else if (shouldClearTaskId) {
    updateData.erp_hrm_task_id = null;
  }
  // Update the timer
  await MyGlobal.prisma.erp_hrm_timers.update({
    where: {
      id: timer.id,
    },
    data: updateData,
  });
  // Fetch updated timer with all relations
  const updatedTimer = await MyGlobal.prisma.erp_hrm_timers.findUniqueOrThrow({
    where: {
      id: timer.id,
    },
    ...ErpHrmTimerTransformer.select(),
  });
  return await ErpHrmTimerTransformer.transform(updatedTimer);
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
// import { IErpHrmTimer } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimer";
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
// export async function putErpHrmMemberTimers(props: {
//   member: MemberPayload;
//   body: IErpHrmTimer.IUpdate;
// }): Promise<IErpHrmTimer> {
//   await MyGlobal.prisma.erp_hrm_timers.update({
//     where: { ... },
//     data: { ... },
//   });
//   const updated = await MyGlobal.prisma.erp_hrm_timers.findUniqueOrThrow({
//     where: { ... },
//     ...ErpHrmTimerTransformer.select(),
//   });
//   return await ErpHrmTimerTransformer.transform(updated);
// }
// ```
//--------------------------------------------------------------