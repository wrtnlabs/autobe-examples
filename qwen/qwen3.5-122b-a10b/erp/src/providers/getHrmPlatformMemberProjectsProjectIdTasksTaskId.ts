import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IHrmPlatformDepartment } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformDepartment";
import { IHrmPlatformEmployee } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformEmployee";
import { IHrmPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformMember";
import { IHrmPlatformOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformOrganization";
import { IHrmPlatformProject } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformProject";
import { IHrmPlatformRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformRole";
import { IHrmPlatformTask } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformTask";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { MemberPayload } from "../decorators/payload/MemberPayload";
import { HrmPlatformTaskTransformer } from "../transformers/HrmPlatformTaskTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function getHrmPlatformMemberProjectsProjectIdTasksTaskId(props: {
  member: MemberPayload;
  projectId: string & tags.Format<"uuid">;
  taskId: string & tags.Format<"uuid">;
}): Promise<IHrmPlatformTask> {
  // Step 1: Validate project exists
  const project = await MyGlobal.prisma.hrm_platform_projects.findUnique({
    where: { id: props.projectId },
    select: { id: true, hrm_platform_organization_id: true },
  });
  if (project === null) {
    throw new HttpException("Project not found", 404);
  }
  // Step 2: Find employee record for this member in the project's organization
  const employee = await MyGlobal.prisma.hrm_platform_employees.findFirst({
    where: {
      hrm_platform_user_id: props.member.id,
      hrm_platform_organization_id: project.hrm_platform_organization_id,
      deleted_at: null,
    },
    select: { id: true },
  });
  if (employee === null) {
    throw new HttpException("Forbidden", 403);
  }
  // Step 3: Verify member has access to the project (project membership check)
  const projectMember =
    await MyGlobal.prisma.hrm_platform_project_members.findFirst({
      where: {
        hrm_platform_project_id: props.projectId,
        hrm_platform_employee_id: employee.id,
      },
      select: { id: true },
    });
  if (projectMember === null) {
    throw new HttpException("Forbidden", 403);
  }
  // Step 4: Validate task exists, belongs to project, and is not soft-deleted
  const task = await MyGlobal.prisma.hrm_platform_tasks.findUnique({
    where: { id: props.taskId },
    select: {
      id: true,
      hrm_platform_projects_id: true,
      deleted_at: true,
    },
  });
  if (task === null) {
    throw new HttpException("Task not found", 404);
  }
  if (task.hrm_platform_projects_id !== props.projectId) {
    throw new HttpException(
      "Task does not belong to the specified project",
      404,
    );
  }
  if (task.deleted_at !== null) {
    throw new HttpException("Task not found", 404);
  }
  // Step 5: Fetch the task with all required relations
  const taskWithRelations =
    await MyGlobal.prisma.hrm_platform_tasks.findUniqueOrThrow({
      where: { id: props.taskId },
      ...HrmPlatformTaskTransformer.select(),
    });
  // Step 6: Transform the result
  return await HrmPlatformTaskTransformer.transform(taskWithRelations);
}
