import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IHrmDepartment } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmDepartment";
import { IHrmEmployee } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmEmployee";
import { IHrmMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmMember";
import { IHrmOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmOrganization";
import { IHrmProject } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmProject";
import { IHrmRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmRole";
import { IHrmTask } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTask";
import { IHrmTaskHistory } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTaskHistory";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { MemberPayload } from "../decorators/payload/MemberPayload";
import { HrmTaskTransformer } from "../transformers/HrmTaskTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function putHrmMemberOrganizationsOrganizationIdProjectsProjectIdTasksTaskIdStatus(props: {
  member: MemberPayload;
  organizationId: string & tags.Format<"uuid">;
  projectId: string & tags.Format<"uuid">;
  taskId: string & tags.Format<"uuid">;
  body: IHrmTask.IStatusUpdate;
}): Promise<IHrmTask> {
  const allowedStatuses: readonly string[] = [
    "open",
    "in-progress",
    "completed",
    "closed",
  ];
  if (!allowedStatuses.includes(props.body.status)) {
    throw new HttpException(
      "Invalid status value. Must be one of: open, in-progress, completed, closed",
      400,
    );
  }
  const task = await MyGlobal.prisma.hrm_tasks.findUniqueOrThrow({
    where: { id: props.taskId },
    select: {
      id: true,
      project_id: true,
      assigned_employee_id: true,
      status: true,
      project: {
        select: {
          organization: {
            select: {
              id: true,
            },
          },
        },
      },
    },
  } satisfies Prisma.hrm_tasksFindUniqueArgs);
  if (task.project.organization.id !== props.organizationId) {
    throw new HttpException("Task not found in organization", 404);
  }
  if (task.project_id !== props.projectId) {
    throw new HttpException("Task not found in project", 404);
  }
  const employee = await MyGlobal.prisma.hrm_employees.findFirst({
    where: {
      user_id: props.member.id,
      organization_id: props.organizationId,
      deleted_at: null,
    },
    select: { id: true },
  });
  if (!employee) {
    throw new HttpException("Forbidden", 403);
  }
  const projectMember = await MyGlobal.prisma.hrm_project_members.findFirst({
    where: {
      project_id: props.projectId,
      employee_id: employee.id,
    },
    select: {
      role: true,
    },
  });
  const isProjectLead = projectMember?.role === "project-lead";
  const isAssignedEmployee = task.assigned_employee_id === employee.id;
  if (!isProjectLead && !isAssignedEmployee) {
    throw new HttpException("Forbidden", 403);
  }
  const oldStatus = task.status;
  const newStatus = props.body.status;
  await MyGlobal.prisma.$transaction([
    MyGlobal.prisma.hrm_tasks.update({
      where: { id: props.taskId },
      data: {
        status: newStatus,
        updated_at: new Date(),
      },
    }),
    MyGlobal.prisma.hrm_task_histories.create({
      data: {
        id: v4(),
        task: { connect: { id: props.taskId } },
        member: { connect: { id: props.member.id } },
        timestamp: new Date(),
        old_status: oldStatus,
        new_status: newStatus,
        created_at: new Date(),
        updated_at: new Date(),
      },
    }),
  ]);
  const updated = await MyGlobal.prisma.hrm_tasks.findUniqueOrThrow({
    where: { id: props.taskId },
    ...HrmTaskTransformer.select(),
  });
  return await HrmTaskTransformer.transform(updated);
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
// import { IHrmTask } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTask";
// import { IHrmProject } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmProject";
// import { IHrmOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmOrganization";
// import { IHrmEmployee } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmEmployee";
// import { IHrmMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmMember";
// import { IHrmRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmRole";
// import { IHrmDepartment } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmDepartment";
// import { IHrmTaskHistory } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTaskHistory";
// 
// // DON'T CHANGE FUNCTION NAME AND PARAMETERS,
// // ONLY YOU HAVE TO WRITE THIS FUNCTION BODY, AND USE IMPORTED.
// export async function putHrmMemberOrganizationsOrganizationIdProjectsProjectIdTasksTaskIdStatus(props: {
//   member: MemberPayload;
//   organizationId: string & tags.Format<"uuid">;
//   projectId: string & tags.Format<"uuid">;
//   taskId: string & tags.Format<"uuid">;
//   body: IHrmTask.IStatusUpdate;
// }): Promise<IHrmTask> {
//   await MyGlobal.prisma.hrm_tasks.update({
//     where: { ... },
//     data: { ... },
//   });
//   const updated = await MyGlobal.prisma.hrm_tasks.findUniqueOrThrow({
//     where: { ... },
//     ...HrmTaskTransformer.select(),
//   });
//   return await HrmTaskTransformer.transform(updated);
// }
// ```
//--------------------------------------------------------------