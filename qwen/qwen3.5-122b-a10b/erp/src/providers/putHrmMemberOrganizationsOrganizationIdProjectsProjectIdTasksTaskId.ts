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

export async function putHrmMemberOrganizationsOrganizationIdProjectsProjectIdTasksTaskId(props: {
  member: MemberPayload;
  organizationId: string & tags.Format<"uuid">;
  projectId: string & tags.Format<"uuid">;
  taskId: string & tags.Format<"uuid">;
  body: IHrmTask.IUpdate;
}): Promise<IHrmTask> {
  // 1. Validate organization exists
  const organization = await MyGlobal.prisma.hrm_organizations.findUnique({
    where: { id: props.organizationId, deleted_at: null },
  });
  if (!organization) {
    throw new HttpException("Organization not found", 404);
  }
  // 2. Validate project belongs to organization
  const project = await MyGlobal.prisma.hrm_projects.findUnique({
    where: { id: props.projectId, deleted_at: null },
  });
  if (!project || project.hrm_organization_id !== props.organizationId) {
    throw new HttpException(
      "Project not found or doesn't belong to organization",
      404,
    );
  }
  // 3. Validate task exists and belongs to project
  const task = await MyGlobal.prisma.hrm_tasks.findUnique({
    where: { id: props.taskId, deleted_at: null },
  });
  if (!task || task.project_id !== props.projectId) {
    throw new HttpException("Task not found or doesn't belong to project", 404);
  }
  // 4. Find employee record for this member in this organization
  const employee = await MyGlobal.prisma.hrm_employees.findFirst({
    where: {
      user_id: props.member.id,
      organization_id: props.organizationId,
      deleted_at: null,
    },
  });
  if (!employee) {
    throw new HttpException("You are not a member of this organization", 403);
  }
  // 5. Check permission: project-lead OR project:manage permission
  const projectMember = await MyGlobal.prisma.hrm_project_members.findFirst({
    where: {
      project_id: props.projectId,
      employee_id: employee.id,
    },
  });
  const isProjectLead = projectMember?.role === "project-lead";
  // Check for project:manage permission via role_permissions
  const permission = await MyGlobal.prisma.hrm_permissions.findFirst({
    where: { permission_name: "project:manage" },
  });
  let hasManagePermission = false;
  if (permission) {
    const rolePermission = await MyGlobal.prisma.hrm_role_permissions.findFirst(
      {
        where: {
          hrm_role_id: employee.role_id,
          hrm_permission_id: permission.id,
        },
      },
    );
    hasManagePermission = !!rolePermission;
  }
  if (!isProjectLead && !hasManagePermission) {
    throw new HttpException("Forbidden", 403);
  }
  // 6. Validate assigned_employee_id if provided
  if (props.body.assigned_employee_id !== undefined) {
    if (props.body.assigned_employee_id !== null) {
      const assignedEmployee = await MyGlobal.prisma.hrm_employees.findFirst({
        where: {
          id: props.body.assigned_employee_id,
          organization_id: props.organizationId,
          deleted_at: null,
        },
      });
      if (!assignedEmployee) {
        throw new HttpException(
          "Assigned employee not found in organization",
          404,
        );
      }
    }
  }
  // 7. Validate parent_task_id if provided
  if (props.body.parent_task_id !== undefined) {
    if (props.body.parent_task_id !== null) {
      const parentTask = await MyGlobal.prisma.hrm_tasks.findFirst({
        where: {
          id: props.body.parent_task_id,
          project_id: props.projectId,
          deleted_at: null,
        },
      });
      if (!parentTask) {
        throw new HttpException("Parent task not found in project", 404);
      }
      // Prevent circular reference
      if (props.body.parent_task_id === props.taskId) {
        throw new HttpException("Cannot set task as its own parent", 400);
      }
    }
  }
  // 8. Validate status transitions
  const validTransitions: Record<string, string[]> = {
    open: ["in-progress"],
    "in-progress": ["completed"],
    completed: ["closed"],
    closed: [],
  };
  if (
    props.body.status !== undefined &&
    props.body.status !== null &&
    props.body.status !== task.status
  ) {
    const allowedNext = validTransitions[task.status];
    if (!allowedNext || !allowedNext.includes(props.body.status)) {
      throw new HttpException("Invalid status transition", 400);
    }
  }
  // 9. Prepare update data
  const updateData: Prisma.hrm_tasksUpdateInput = {
    updated_at: new Date(),
  };
  if (props.body.title !== undefined) updateData.title = props.body.title;
  if (props.body.description !== undefined)
    updateData.description = props.body.description;
  if (props.body.status !== undefined) updateData.status = props.body.status;
  if (props.body.priority !== undefined)
    updateData.priority = props.body.priority;
  if (props.body.estimated_hours !== undefined)
    updateData.estimated_hours = props.body.estimated_hours;
  if (props.body.due_date !== undefined) {
    updateData.due_date = props.body.due_date
      ? new Date(props.body.due_date)
      : null;
  }
  if (props.body.assigned_employee_id !== undefined) {
    if (props.body.assigned_employee_id !== null) {
      updateData.assignedEmployee = {
        connect: { id: props.body.assigned_employee_id },
      };
    } else {
      updateData.assignedEmployee = { disconnect: true };
    }
  }
  if (props.body.parent_task_id !== undefined) {
    if (props.body.parent_task_id !== null) {
      updateData.parentTask = { connect: { id: props.body.parent_task_id } };
    } else {
      updateData.parentTask = { disconnect: true };
    }
  }
  // 10. Update task
  await MyGlobal.prisma.hrm_tasks.update({
    where: { id: props.taskId },
    data: updateData,
  });
  // 11. Create history record if status changed
  const oldStatus = task.status;
  const newStatus = props.body.status ?? oldStatus;
  if (oldStatus !== newStatus) {
    const historyId = v4();
    await MyGlobal.prisma.hrm_task_histories.create({
      data: {
        id: historyId,
        hrm_task_id: props.taskId,
        hrm_member_id: props.member.id,
        timestamp: new Date(),
        old_status: oldStatus,
        new_status: newStatus,
        created_at: new Date(),
        updated_at: new Date(),
      },
    });
  }
  // 12. Return updated task
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
// export async function putHrmMemberOrganizationsOrganizationIdProjectsProjectIdTasksTaskId(props: {
//   member: MemberPayload;
//   organizationId: string & tags.Format<"uuid">;
//   projectId: string & tags.Format<"uuid">;
//   taskId: string & tags.Format<"uuid">;
//   body: IHrmTask.IUpdate;
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