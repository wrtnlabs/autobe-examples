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
  const project = await MyGlobal.prisma.hrm_platform_projects.findFirst({
    where: {
      id: props.projectId,
      deleted_at: null,
    },
  });
  if (project === null) {
    throw new HttpException("Project not found", 404);
  }
  // Step 2: Validate taskId exists, belongs to projectId, and is not soft-deleted
  const task = await MyGlobal.prisma.hrm_platform_tasks.findFirst({
    where: {
      id: props.taskId,
      hrm_platform_projects_id: props.projectId,
      deleted_at: null,
    },
  });
  if (task === null) {
    throw new HttpException("Task not found", 404);
  }
  // Step 3: Find the employee record for this member
  const employee = await MyGlobal.prisma.hrm_platform_employees.findFirst({
    where: {
      hrm_platform_user_id: props.member.id,
      deleted_at: null,
    },
  });
  if (employee === null) {
    throw new HttpException("Forbidden", 403);
  }
  // Step 4: Verify member has project access (project member or project:manage permission)
  const projectMember =
    await MyGlobal.prisma.hrm_platform_project_members.findFirst({
      where: {
        hrm_platform_project_id: props.projectId,
        hrm_platform_employee_id: employee.id,
        deleted_at: null,
      },
    });
  if (projectMember === null) {
    throw new HttpException("Forbidden", 403);
  }
  // Step 5: Validate historyId exists, belongs to taskId, and is not soft-deleted
  const history = await MyGlobal.prisma.hrm_platform_task_histories.findFirst({
    where: {
      id: props.historyId,
      hrm_platform_task_id: props.taskId,
      deleted_at: null,
    },
  });
  if (history === null) {
    throw new HttpException("History record not found", 404);
  }
  // Step 6: Load full history with relations and transform
  const fullHistory =
    await MyGlobal.prisma.hrm_platform_task_histories.findUniqueOrThrow({
      where: { id: props.historyId },
      ...HrmPlatformTaskHistoryTransformer.select(),
    });
  return await HrmPlatformTaskHistoryTransformer.transform(fullHistory);
}
