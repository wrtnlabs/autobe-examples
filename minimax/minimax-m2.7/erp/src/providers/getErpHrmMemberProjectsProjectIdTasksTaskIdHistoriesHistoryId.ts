import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IErpHrmMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmMember";
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
  // Verify the task exists and belongs to the specified project
  const task = await MyGlobal.prisma.erp_hrm_tasks.findUniqueOrThrow({
    where: { id: props.taskId },
    select: {
      id: true,
      erp_hrm_project_id: true,
    },
  });
  // Ensure task belongs to the requested project
  if (task.erp_hrm_project_id !== props.projectId) {
    throw new HttpException("Task not found in project", 404);
  }
  // Verify the history entry exists and belongs to the task
  const historyEntry =
    await MyGlobal.prisma.erp_hrm_task_histories.findUniqueOrThrow({
      where: { id: props.historyId },
      select: {
        id: true,
        erp_hrm_task_id: true,
      },
    });
  // Ensure history belongs to the requested task
  if (historyEntry.erp_hrm_task_id !== props.taskId) {
    throw new HttpException("History not found for task", 404);
  }
  // Check authorization - verify member has access to the project
  // Member must either be a project member OR have project:manage permission
  const employee = await MyGlobal.prisma.erp_hrm_employees.findFirst({
    where: {
      erp_hrm_member_id: props.member.id,
      deleted_at: null,
    },
    select: {
      id: true,
      erp_hrm_role_id: true,
    },
  });
  if (!employee) {
    throw new HttpException("Forbidden", 403);
  }
  // Check if employee has project:manage permission or is a project member
  const hasProjectPermission =
    await MyGlobal.prisma.erp_hrm_role_permissions.findFirst({
      where: {
        erp_hrm_role_id: employee.erp_hrm_role_id,
        permission: "project:manage",
      },
    });
  const isProjectMember =
    await MyGlobal.prisma.erp_hrm_project_members.findFirst({
      where: {
        erp_hrm_employee_id: employee.id,
        erp_hrm_project_id: props.projectId,
      },
    });
  if (!hasProjectPermission && !isProjectMember) {
    throw new HttpException("Forbidden", 403);
  }
  // Fetch the complete history entry with related data using transformer
  const history =
    await MyGlobal.prisma.erp_hrm_task_histories.findUniqueOrThrow({
      where: { id: props.historyId },
      ...ErpHrmTaskHistoryTransformer.select(),
    });
  return await ErpHrmTaskHistoryTransformer.transform(history);
}
