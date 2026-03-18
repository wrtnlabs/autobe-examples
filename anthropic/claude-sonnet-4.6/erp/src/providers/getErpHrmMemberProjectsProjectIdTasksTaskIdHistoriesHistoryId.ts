import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IErpHrmDepartment } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmDepartment";
import { IErpHrmMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmMember";
import { IErpHrmOrganizationMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmOrganizationMember";
import { IErpHrmRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmRole";
import { IErpHrmRolePermission } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmRolePermission";
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
  // Step 1: Load project and get organization scope
  const project = await MyGlobal.prisma.erp_hrm_projects.findFirst({
    where: {
      id: props.projectId,
      deleted_at: null,
    },
    select: {
      id: true,
      organization_id: true,
    },
  });
  if (project === null) {
    throw new HttpException("Project not found", 404);
  }
  // Step 2: Find the organization member record for this member in this organization
  const orgMember =
    await MyGlobal.prisma.erp_hrm_organization_members.findFirst({
      where: {
        member_id: props.member.id,
        organization_id: project.organization_id,
        status: "active",
      },
      select: {
        id: true,
        role_id: true,
      },
    });
  if (orgMember === null) {
    throw new HttpException("Forbidden", 403);
  }
  // Step 3: Check if member has project:manage permission
  const managePermission =
    await MyGlobal.prisma.erp_hrm_role_permissions.findFirst({
      where: {
        role_id: orgMember.role_id,
        permission_code: "project:manage",
      },
      select: { id: true },
    });
  if (managePermission === null) {
    // Step 3b: Check if member is an active project member
    const projectMember =
      await MyGlobal.prisma.erp_hrm_project_members.findFirst({
        where: {
          project_id: props.projectId,
          organization_member_id: orgMember.id,
          deleted_at: null,
        },
        select: { id: true },
      });
    if (projectMember === null) {
      throw new HttpException("Forbidden", 403);
    }
  }
  // Step 4: Verify the task exists, belongs to the project, and is not deleted
  const task = await MyGlobal.prisma.erp_hrm_tasks.findFirst({
    where: {
      id: props.taskId,
      project: { id: props.projectId },
      deleted_at: null,
    },
    select: { id: true },
  });
  if (task === null) {
    throw new HttpException("Task not found", 404);
  }
  // Step 5: Load the history entry, verifying it belongs to the specified task
  const rawHistory = await MyGlobal.prisma.erp_hrm_task_histories.findFirst({
    where: {
      id: props.historyId,
      erp_hrm_task_id: props.taskId,
    },
    ...ErpHrmTaskHistoryTransformer.select(),
  });
  if (rawHistory === null) {
    throw new HttpException("Task history entry not found", 404);
  }
  // Step 6: Transform and return
  const history = rawHistory as unknown as Parameters<
    typeof ErpHrmTaskHistoryTransformer.transform
  >[0];
  return ErpHrmTaskHistoryTransformer.transform(history);
}
