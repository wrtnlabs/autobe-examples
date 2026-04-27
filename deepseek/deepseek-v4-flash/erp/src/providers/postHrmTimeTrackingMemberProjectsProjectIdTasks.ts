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
import { HrmTimeTrackingTaskCollector } from "../collectors/HrmTimeTrackingTaskCollector";
import { MemberPayload } from "../decorators/payload/MemberPayload";
import { HrmTimeTrackingTaskTransformer } from "../transformers/HrmTimeTrackingTaskTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function postHrmTimeTrackingMemberProjectsProjectIdTasks(props: {
  member: MemberPayload;
  projectId: string & tags.Format<"uuid">;
  body: IHrmTimeTrackingTask.ICreate;
}): Promise<IHrmTimeTrackingTask> {
  // 1. Resolve project context
  const project =
    await MyGlobal.prisma.hrm_time_tracking_projects.findUniqueOrThrow({
      where: { id: props.projectId },
      select: {
        id: true,
        hrm_time_tracking_organization_id: true,
      },
    });
  // 2. Find the authenticated member's employee record in the org
  const employee =
    await MyGlobal.prisma.hrm_time_tracking_employees.findFirstOrThrow({
      where: {
        hrm_time_tracking_member_id: props.member.id,
        hrm_time_tracking_organization_id:
          project.hrm_time_tracking_organization_id,
        deleted_at: null,
      },
      select: {
        id: true,
        hrm_time_tracking_role_id: true,
      },
    });
  // 3. Authorize: project:manage permission OR project-lead role
  const hasOrgPermission =
    await MyGlobal.prisma.hrm_time_tracking_role_permissions.findFirst({
      where: {
        hrm_time_tracking_role_id: employee.hrm_time_tracking_role_id,
        permission_code: "project:manage",
        deleted_at: null,
      },
    });
  if (hasOrgPermission === null) {
    const isProjectLead =
      await MyGlobal.prisma.hrm_time_tracking_project_members.findFirst({
        where: {
          hrm_time_tracking_project_id: props.projectId,
          hrm_time_tracking_employee_id: employee.id,
          role: "project-lead",
          deleted_at: null,
        },
      });
    if (isProjectLead === null) {
      throw new HttpException("Forbidden", 403);
    }
  }
  // 4. Validate employee_id: exists, active, and is project member
  if (props.body.employee_id !== undefined && props.body.employee_id !== null) {
    const assignedEmployee =
      await MyGlobal.prisma.hrm_time_tracking_employees.findFirst({
        where: {
          id: props.body.employee_id,
          hrm_time_tracking_organization_id:
            project.hrm_time_tracking_organization_id,
          status: "active",
          deleted_at: null,
        },
        select: { id: true },
      });
    if (assignedEmployee === null) {
      throw new HttpException("Assigned employee not found or not active", 400);
    }
    const membership =
      await MyGlobal.prisma.hrm_time_tracking_project_members.findFirst({
        where: {
          hrm_time_tracking_project_id: props.projectId,
          hrm_time_tracking_employee_id: props.body.employee_id,
          deleted_at: null,
        },
        select: { id: true },
      });
    if (membership === null) {
      throw new HttpException(
        "Assigned employee is not a member of this project",
        400,
      );
    }
  }
  // 5. Validate parent_task_id: same project, not itself a subtask
  if (
    props.body.parent_task_id !== undefined &&
    props.body.parent_task_id !== null
  ) {
    const parentTask = await MyGlobal.prisma.hrm_time_tracking_tasks.findFirst({
      where: {
        id: props.body.parent_task_id,
        hrm_time_tracking_project_id: props.projectId,
        deleted_at: null,
      },
      select: {
        id: true,
        parent_task_id: true,
      },
    });
    if (parentTask === null) {
      throw new HttpException("Parent task not found in this project", 400);
    }
    if (parentTask.parent_task_id !== null) {
      throw new HttpException("Parent task cannot itself be a subtask", 400);
    }
  }
  // 6. Collect task data using existing collector (handles defaults: status=open, priority=medium)
  const taskData = await HrmTimeTrackingTaskCollector.collect({
    body: props.body,
    hrmTimeTrackingProjects: { id: props.projectId },
  });
  const taskId = taskData.id;
  // 7. Create the task record
  await MyGlobal.prisma.hrm_time_tracking_tasks.create({
    data: taskData,
  });
  // 8. Create initial task history entry (previous_status is required non-nullable String)
  await MyGlobal.prisma.hrm_time_tracking_task_histories.create({
    data: {
      id: v4(),
      task: { connect: { id: taskId } },
      employee: { connect: { id: employee.id } },
      previous_status: "",
      new_status: "open",
      created_at: taskData.created_at,
      updated_at: taskData.updated_at,
      deleted_at: null,
    } satisfies Prisma.hrm_time_tracking_task_historiesCreateInput,
  });
  // 9. Fetch full record with all nested relations
  const record =
    await MyGlobal.prisma.hrm_time_tracking_tasks.findUniqueOrThrow({
      where: { id: taskId },
      ...HrmTimeTrackingTaskTransformer.select(),
    });
  // 10. Transform to API response DTO
  return await HrmTimeTrackingTaskTransformer.transform(record);
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
// export async function postHrmTimeTrackingMemberProjectsProjectIdTasks(props: {
//   member: MemberPayload;
//   projectId: string & tags.Format<"uuid">;
//   body: IHrmTimeTrackingTask.ICreate;
// }): Promise<IHrmTimeTrackingTask> {
//   const record = await MyGlobal.prisma.hrm_time_tracking_tasks.create({
//     data: await HrmTimeTrackingTaskCollector.collect({
//       body: props.body,
//       ...
//     }),
//     ...HrmTimeTrackingTaskTransformer.select(),
//   });
//   return await HrmTimeTrackingTaskTransformer.transform(record);
// }
// ```
//--------------------------------------------------------------