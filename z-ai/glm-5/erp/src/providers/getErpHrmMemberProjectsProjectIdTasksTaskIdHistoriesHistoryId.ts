import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IErpHrmDepartment } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmDepartment";
import { IErpHrmEmployee } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmEmployee";
import { IErpHrmMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmMember";
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
import { ErpHrmTaskHistoryTransformer } from "../transformers/ErpHrmTaskHistoryTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function getErpHrmMemberProjectsProjectIdTasksTaskIdHistoriesHistoryId(props: {
  member: MemberPayload;
  projectId: string & tags.Format<"uuid">;
  taskId: string & tags.Format<"uuid">;
  historyId: string & tags.Format<"uuid">;
}): Promise<IErpHrmTaskHistory> {
  // Query history entry with task and member relations
  const history = await MyGlobal.prisma.erp_hrm_task_histories.findUnique({
    where: { id: props.historyId },
    ...ErpHrmTaskHistoryTransformer.select(),
  });
  // Validate history exists and matches path parameters
  if (history === null) {
    throw new HttpException("History entry not found", 404);
  }
  if (history.task.id !== props.taskId) {
    throw new HttpException("History entry not found for this task", 404);
  }
  // Get task to verify project and check assignment
  const task = await MyGlobal.prisma.erp_hrm_tasks.findUnique({
    where: { id: props.taskId },
    select: {
      project_id: true,
      employee_id: true,
      project: {
        select: {
          organization_id: true,
        },
      },
    },
  });
  if (task === null) {
    throw new HttpException("Task not found", 404);
  }
  if (task.project_id !== props.projectId) {
    throw new HttpException("Task not found in this project", 404);
  }
  // Get employee record for the member in this organization
  const employee = await MyGlobal.prisma.erp_hrm_employees.findFirst({
    where: {
      erp_hrm_member_id: props.member.id,
      erp_hrm_organization_id: task.project.organization_id,
      deleted_at: null,
    },
    select: {
      id: true,
      erp_hrm_role_id: true,
    },
  });
  if (employee === null) {
    throw new HttpException("Forbidden", 403);
  }
  // Check if assigned to the task
  if (task.employee_id === employee.id) {
    return await ErpHrmTaskHistoryTransformer.transform(history);
  }
  // Check if project lead for this project
  const projectMembership =
    await MyGlobal.prisma.erp_hrm_project_members.findFirst({
      where: {
        erp_hrm_employee_id: employee.id,
        erp_hrm_project_id: props.projectId,
        role: "project_lead",
        deleted_at: null,
      },
    });
  if (projectMembership !== null) {
    return await ErpHrmTaskHistoryTransformer.transform(history);
  }
  // Check for project:manage permission
  const managePermission =
    await MyGlobal.prisma.erp_hrm_role_permissions.findFirst({
      where: {
        erp_hrm_role_id: employee.erp_hrm_role_id,
        permission: "project:manage",
      },
    });
  if (managePermission !== null) {
    return await ErpHrmTaskHistoryTransformer.transform(history);
  }
  // Check for time:approve permission
  const timeApprovePermission =
    await MyGlobal.prisma.erp_hrm_role_permissions.findFirst({
      where: {
        erp_hrm_role_id: employee.erp_hrm_role_id,
        permission: "time:approve",
      },
    });
  if (timeApprovePermission !== null) {
    return await ErpHrmTaskHistoryTransformer.transform(history);
  }
  // Check for employee:view permission
  const employeeViewPermission =
    await MyGlobal.prisma.erp_hrm_role_permissions.findFirst({
      where: {
        erp_hrm_role_id: employee.erp_hrm_role_id,
        permission: "employee:view",
      },
    });
  if (employeeViewPermission !== null) {
    return await ErpHrmTaskHistoryTransformer.transform(history);
  }
  throw new HttpException("Forbidden", 403);
}
