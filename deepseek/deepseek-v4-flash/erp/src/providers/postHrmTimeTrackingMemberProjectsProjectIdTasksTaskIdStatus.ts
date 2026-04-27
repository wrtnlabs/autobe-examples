import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IHrmTimeTrackingDepartment } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingDepartment";
import { IHrmTimeTrackingEmployee } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingEmployee";
import { IHrmTimeTrackingMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingMember";
import { IHrmTimeTrackingOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingOrganization";
import { IHrmTimeTrackingProject } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingProject";
import { IHrmTimeTrackingRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingRole";
import { IHrmTimeTrackingTask } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingTask";
import { IHrmTimeTrackingTaskHistory } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingTaskHistory";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { MemberPayload } from "../decorators/payload/MemberPayload";
import { HrmTimeTrackingTaskTransformer } from "../transformers/HrmTimeTrackingTaskTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function postHrmTimeTrackingMemberProjectsProjectIdTasksTaskIdStatus(props: {
  member: MemberPayload;
  projectId: string & tags.Format<"uuid">;
  taskId: string & tags.Format<"uuid">;
  body: IHrmTimeTrackingTask.IUpdateStatus;
}): Promise<IHrmTimeTrackingTask> {
  // 1. Verify task exists, belongs to the project, and fetch current state + project org context
  const task = await MyGlobal.prisma.hrm_time_tracking_tasks.findFirstOrThrow({
    where: {
      id: props.taskId,
      hrm_time_tracking_project_id: props.projectId,
      deleted_at: null,
    },
    select: {
      id: true,
      status: true,
      hrm_time_tracking_employee_id: true,
      project: {
        select: {
          hrm_time_tracking_organization_id: true,
        },
      },
    },
  });
  // 2. Find the employee record for the current member within the project's organization
  const employee =
    await MyGlobal.prisma.hrm_time_tracking_employees.findFirstOrThrow({
      where: {
        hrm_time_tracking_member_id: props.member.id,
        hrm_time_tracking_organization_id:
          task.project.hrm_time_tracking_organization_id,
        deleted_at: null,
        status: "active",
      },
      select: {
        id: true,
        hrm_time_tracking_role_id: true,
      },
    });
  // 3. Authorization: must be the assigned employee, a project-lead, or have project:manage permission
  const isAssignedEmployee: boolean =
    task.hrm_time_tracking_employee_id === employee.id;
  const projectLeadMembership =
    await MyGlobal.prisma.hrm_time_tracking_project_members.findFirst({
      where: {
        hrm_time_tracking_project_id: props.projectId,
        hrm_time_tracking_employee_id: employee.id,
        role: "project-lead",
        deleted_at: null,
      },
    });
  const projectManagePermission =
    await MyGlobal.prisma.hrm_time_tracking_role_permissions.findFirst({
      where: {
        hrm_time_tracking_role_id: employee.hrm_time_tracking_role_id,
        permission_code: "project:manage",
        deleted_at: null,
      },
    });
  if (
    isAssignedEmployee === false &&
    projectLeadMembership === null &&
    projectManagePermission === null
  ) {
    throw new HttpException("Forbidden", 403);
  }
  // 4. Validate linear status progression: open(0) -> in-progress(1) -> completed(2) -> closed(3)
  const statusOrder: Record<string, number> = {
    open: 0,
    "in-progress": 1,
    completed: 2,
    closed: 3,
  };
  const currentIndex: number = statusOrder[task.status];
  const newIndex: number = statusOrder[props.body.status];
  if (newIndex !== currentIndex + 1) {
    throw new HttpException(
      "Invalid status transition. Status must follow linear progression: open -> in-progress -> completed -> closed",
      422,
    );
  }
  // 5. Atomically update task status and create immutable history entry
  const now: string = new Date().toISOString();
  await MyGlobal.prisma.$transaction([
    MyGlobal.prisma.hrm_time_tracking_tasks.update({
      where: { id: props.taskId },
      data: {
        status: props.body.status,
        updated_at: now,
      },
    }),
    MyGlobal.prisma.hrm_time_tracking_task_histories.create({
      data: {
        id: v4(),
        hrm_time_tracking_task_id: props.taskId,
        hrm_time_tracking_employee_id: employee.id,
        previous_status: task.status,
        new_status: props.body.status,
        created_at: now,
        updated_at: now,
        deleted_at: null,
      },
    }),
  ]);
  // 6. Fetch and return the full updated task entity via transformer
  const updatedTask =
    await MyGlobal.prisma.hrm_time_tracking_tasks.findUniqueOrThrow({
      where: { id: props.taskId },
      ...HrmTimeTrackingTaskTransformer.select(),
    });
  return await HrmTimeTrackingTaskTransformer.transform(updatedTask);
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
// import { IHrmTimeTrackingTask } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingTask";
// import { IHrmTimeTrackingProject } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingProject";
// import { IHrmTimeTrackingOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingOrganization";
// import { IHrmTimeTrackingMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingMember";
// import { IHrmTimeTrackingEmployee } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingEmployee";
// import { IHrmTimeTrackingRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingRole";
// import { IHrmTimeTrackingDepartment } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingDepartment";
// import { IHrmTimeTrackingTaskHistory } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingTaskHistory";
// 
// // DON'T CHANGE FUNCTION NAME AND PARAMETERS,
// // ONLY YOU HAVE TO WRITE THIS FUNCTION BODY, AND USE IMPORTED.
// export async function postHrmTimeTrackingMemberProjectsProjectIdTasksTaskIdStatus(props: {
//   member: MemberPayload;
//   projectId: string & tags.Format<"uuid">;
//   taskId: string & tags.Format<"uuid">;
//   body: IHrmTimeTrackingTask.IUpdateStatus;
// }): Promise<IHrmTimeTrackingTask> {
//   const record = await MyGlobal.prisma.hrm_time_tracking_tasks.findFirstOrThrow({
//     ...HrmTimeTrackingTaskTransformer.select(),
//     where: { ... },
//   });
//   return await HrmTimeTrackingTaskTransformer.transform(record);
// }
// ```
//--------------------------------------------------------------