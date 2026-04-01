import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IHrmPlatformDepartment } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformDepartment";
import { IHrmPlatformEmployee } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformEmployee";
import { IHrmPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformMember";
import { IHrmPlatformOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformOrganization";
import { IHrmPlatformProject } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformProject";
import { IHrmPlatformRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformRole";
import { IHrmPlatformTask } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformTask";
import { IHrmPlatformTaskHistory } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformTaskHistory";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { MemberPayload } from "../decorators/payload/MemberPayload";
import { HrmPlatformTaskHistoryTransformer } from "../transformers/HrmPlatformTaskHistoryTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function getHrmPlatformMemberProjectsProjectIdTasksTaskIdHistoriesHistoryId(props: {
  member: MemberPayload;
  projectId: string & tags.Format<"uuid">;
  taskId: string & tags.Format<"uuid">;
  historyId: string & tags.Format<"uuid">;
}): Promise<IHrmPlatformTaskHistory> {
  // Step 1: Validate projectId exists and is not soft-deleted
  await MyGlobal.prisma.hrm_platform_projects.findUniqueOrThrow({
    where: { id: props.projectId },
    select: { id: true },
  });
  // Step 2: Validate taskId exists, belongs to projectId, and is not soft-deleted
  const task = await MyGlobal.prisma.hrm_platform_tasks.findUniqueOrThrow({
    where: { id: props.taskId },
    select: { id: true, hrm_platform_projects_id: true },
  });
  if (task.hrm_platform_projects_id !== props.projectId) {
    throw new HttpException(
      "Task does not belong to the specified project",
      404,
    );
  }
  // Step 3: Validate historyId exists, belongs to taskId, and is not soft-deleted
  const history =
    await MyGlobal.prisma.hrm_platform_task_histories.findUniqueOrThrow({
      where: { id: props.historyId },
      select: { id: true, hrm_platform_task_id: true },
    });
  if (history.hrm_platform_task_id !== props.taskId) {
    throw new HttpException(
      "History record does not belong to the specified task",
      404,
    );
  }
  // Step 4: Verify member has project access (project member or project:manage permission)
  // Find employee record for this member
  const employee = await MyGlobal.prisma.hrm_platform_employees.findFirst({
    where: {
      hrm_platform_user_id: props.member.id,
      hrm_platform_organization_id: task.hrm_platform_projects_id,
      deleted_at: null,
    },
    select: { hrm_platform_role_id: true, id: true },
  });
  // Check if member is a project member
  const projectMember =
    await MyGlobal.prisma.hrm_platform_project_members.findFirst({
      where: {
        hrm_platform_project_id: props.projectId,
        hrm_platform_employee_id: employee?.id,
        deleted_at: null,
      },
    });
  // Check if member has project:manage permission through their organization role
  let hasProjectManagePermission = false;
  if (employee && employee.hrm_platform_role_id) {
    const role = await MyGlobal.prisma.hrm_platform_roles.findUnique({
      where: { id: employee.hrm_platform_role_id },
      select: {
        id: true,
        permissions: {
          select: {
            hrm_platform_permission_id: true,
          },
        },
      },
    });
    if (role) {
      // Get permission codes for this role
      const permissionIds = role.permissions.map(
        (rp) => rp.hrm_platform_permission_id,
      );
      const permissions =
        await MyGlobal.prisma.hrm_platform_permissions.findMany({
          where: { id: { in: permissionIds } },
          select: { code: true },
        });
      hasProjectManagePermission = permissions.some(
        (p) => p.code === "project:manage",
      );
    }
  }
  if (!projectMember && !hasProjectManagePermission) {
    throw new HttpException("You do not have access to this project", 403);
  }
  // Step 5: Load history record with task and member details
  const historyWithRelations =
    await MyGlobal.prisma.hrm_platform_task_histories.findUniqueOrThrow({
      where: { id: props.historyId },
      ...HrmPlatformTaskHistoryTransformer.select(),
    });
  // Step 6: Transform and return
  return await HrmPlatformTaskHistoryTransformer.transform(
    historyWithRelations,
  );
}
