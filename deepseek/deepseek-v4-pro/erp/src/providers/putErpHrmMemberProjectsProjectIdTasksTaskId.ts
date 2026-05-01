import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IErpHrmDepartment } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmDepartment";
import { IErpHrmEmployee } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmEmployee";
import { IErpHrmMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmMember";
import { IErpHrmProject } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmProject";
import { IErpHrmRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmRole";
import { IErpHrmTask } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTask";
import { IErpHrmTaskHistory } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTaskHistory";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { MemberPayload } from "../decorators/payload/MemberPayload";
import { ErpHrmTaskTransformer } from "../transformers/ErpHrmTaskTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function putErpHrmMemberProjectsProjectIdTasksTaskId(props: {
  member: MemberPayload;
  projectId: string & tags.Format<"uuid">;
  taskId: string & tags.Format<"uuid">;
  body: IErpHrmTask.IUpdate;
}): Promise<IErpHrmTask> {
  // Resolve organization context from member's session
  const session =
    await MyGlobal.prisma.erp_hrm_member_sessions.findUniqueOrThrow({
      where: { id: props.member.session_id },
      select: { erp_hrm_organization_id: true },
    });
  if (!session.erp_hrm_organization_id) {
    throw new HttpException("No organization context selected", 400);
  }
  // Resolve employee record for this member within the organization
  const employee = await MyGlobal.prisma.erp_hrm_employees.findUniqueOrThrow({
    where: {
      erp_hrm_member_id_erp_hrm_organization_id: {
        erp_hrm_member_id: props.member.id,
        erp_hrm_organization_id: session.erp_hrm_organization_id,
      },
    },
    select: {
      id: true,
      erp_hrm_role_id: true,
      status: true,
    },
  });
  // Fetch the task and verify existence, project membership, and non-deleted status
  const task = await MyGlobal.prisma.erp_hrm_tasks.findUniqueOrThrow({
    where: { id: props.taskId },
    select: {
      id: true,
      erp_hrm_project_id: true,
      deleted_at: true,
    },
  });
  if (task.erp_hrm_project_id !== props.projectId) {
    throw new HttpException("Task not found in the specified project", 404);
  }
  if (task.deleted_at !== null) {
    throw new HttpException("Task not found", 404);
  }
  // Authorization: project:manage permission OR project-lead role on this project
  const hasProjectManage =
    await MyGlobal.prisma.erp_hrm_role_permissions.findFirst({
      where: {
        erp_hrm_role_id: employee.erp_hrm_role_id,
        permission: {
          key: "project:manage",
        },
      },
      select: { id: true },
    });
  if (!hasProjectManage) {
    const projectLead = await MyGlobal.prisma.erp_hrm_project_members.findFirst(
      {
        where: {
          erp_hrm_employee_id: employee.id,
          erp_hrm_project_id: props.projectId,
          role: "project-lead",
          deleted_at: null,
        },
        select: { id: true },
      },
    );
    if (!projectLead) {
      throw new HttpException(
        "You do not have permission to update tasks in this project",
        403,
      );
    }
  }
  // Validation: title must not be empty if provided
  if (props.body.title !== undefined && props.body.title.trim().length === 0) {
    throw new HttpException("Title must not be empty", 422);
  }
  // Validation: estimated hours must be positive if provided (non-null)
  if (
    props.body.estimated_hours !== undefined &&
    props.body.estimated_hours !== null &&
    props.body.estimated_hours <= 0
  ) {
    throw new HttpException("Estimated hours must be a positive number", 422);
  }
  // Validation: assigned employee must exist, be active, and be a project member
  if (
    props.body.assignedEmployeeId !== undefined &&
    props.body.assignedEmployeeId !== null
  ) {
    const assignee = await MyGlobal.prisma.erp_hrm_employees.findFirst({
      where: {
        id: props.body.assignedEmployeeId,
        erp_hrm_organization_id: session.erp_hrm_organization_id,
        status: "active",
        deleted_at: null,
      },
      select: { id: true },
    });
    if (!assignee) {
      throw new HttpException("Assigned employee not found or not active", 422);
    }
    const isProjectMember =
      await MyGlobal.prisma.erp_hrm_project_members.findFirst({
        where: {
          erp_hrm_employee_id: props.body.assignedEmployeeId,
          erp_hrm_project_id: props.projectId,
          deleted_at: null,
        },
        select: { id: true },
      });
    if (!isProjectMember) {
      throw new HttpException(
        "Assigned employee is not a member of this project",
        422,
      );
    }
  }
  // Validation: parent task constraints
  if (
    props.body.parentTaskId !== undefined &&
    props.body.parentTaskId !== null
  ) {
    // Reject if the task being updated already has child tasks
    const childCount = await MyGlobal.prisma.erp_hrm_tasks.count({
      where: {
        erp_hrm_parent_task_id: props.taskId,
        deleted_at: null,
      },
    });
    if (childCount > 0) {
      throw new HttpException(
        "Cannot assign a parent to a task that already has child tasks — only one level of nesting is allowed",
        422,
      );
    }
    const parentTask = await MyGlobal.prisma.erp_hrm_tasks.findFirst({
      where: {
        id: props.body.parentTaskId,
        deleted_at: null,
      },
      select: {
        id: true,
        erp_hrm_project_id: true,
        erp_hrm_parent_task_id: true,
      },
    });
    if (!parentTask) {
      throw new HttpException("Parent task not found", 422);
    }
    if (parentTask.erp_hrm_project_id !== props.projectId) {
      throw new HttpException(
        "Parent task must belong to the same project",
        422,
      );
    }
    if (parentTask.erp_hrm_parent_task_id !== null) {
      throw new HttpException(
        "Parent task already has a parent — only one level of nesting is allowed",
        422,
      );
    }
    if (parentTask.id === props.taskId) {
      throw new HttpException("A task cannot be its own parent", 422);
    }
  }
  // Perform partial update
  await MyGlobal.prisma.erp_hrm_tasks.update({
    where: { id: props.taskId },
    data: {
      ...(props.body.title !== undefined && { title: props.body.title }),
      ...(props.body.description !== undefined && {
        description: props.body.description,
      }),
      ...(props.body.priority !== undefined && {
        priority: props.body.priority,
      }),
      ...(props.body.estimated_hours !== undefined && {
        estimated_hours: props.body.estimated_hours,
      }),
      ...(props.body.due_date !== undefined && {
        due_date: props.body.due_date,
      }),
      ...(props.body.assignedEmployeeId !== undefined && {
        assignedEmployee: props.body.assignedEmployeeId
          ? { connect: { id: props.body.assignedEmployeeId } }
          : { disconnect: true },
      }),
      ...(props.body.parentTaskId !== undefined && {
        parentTask: props.body.parentTaskId
          ? { connect: { id: props.body.parentTaskId } }
          : { disconnect: true },
      }),
      updated_at: new Date().toISOString(),
    },
  });
  // Fetch and return the updated task with all nested relations
  const updated = await MyGlobal.prisma.erp_hrm_tasks.findUniqueOrThrow({
    where: { id: props.taskId },
    ...ErpHrmTaskTransformer.select(),
  });
  return await ErpHrmTaskTransformer.transform(updated);
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
// import { IErpHrmTask } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTask";
// import { IErpHrmProject } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmProject";
// import { IErpHrmEmployee } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmEmployee";
// import { IErpHrmMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmMember";
// import { IErpHrmRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmRole";
// import { IErpHrmDepartment } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmDepartment";
// import { IErpHrmTaskHistory } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTaskHistory";
// 
// // DON'T CHANGE FUNCTION NAME AND PARAMETERS,
// // ONLY YOU HAVE TO WRITE THIS FUNCTION BODY, AND USE IMPORTED.
// export async function putErpHrmMemberProjectsProjectIdTasksTaskId(props: {
//   member: MemberPayload;
//   projectId: string & tags.Format<"uuid">;
//   taskId: string & tags.Format<"uuid">;
//   body: IErpHrmTask.IUpdate;
// }): Promise<IErpHrmTask> {
//   await MyGlobal.prisma.erp_hrm_tasks.update({
//     where: { ... },
//     data: { ... },
//   });
//   const updated = await MyGlobal.prisma.erp_hrm_tasks.findUniqueOrThrow({
//     where: { ... },
//     ...ErpHrmTaskTransformer.select(),
//   });
//   return await ErpHrmTaskTransformer.transform(updated);
// }
// ```
//--------------------------------------------------------------