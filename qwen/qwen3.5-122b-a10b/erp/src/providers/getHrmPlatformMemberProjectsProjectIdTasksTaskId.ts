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
  // Verify member has access to the project through project membership
  const projectMembership =
    await MyGlobal.prisma.hrm_platform_project_members.findFirst({
      where: {
        hrm_platform_project_id: props.projectId,
        employee: {
          hrm_platform_user_id: props.member.id,
        },
      },
    });
  if (!projectMembership) {
    throw new HttpException("Forbidden", 403);
  }
  // Retrieve task with all required relations using transformer select
  const task = await MyGlobal.prisma.hrm_platform_tasks.findUniqueOrThrow({
    where: { id: props.taskId },
    ...HrmPlatformTaskTransformer.select(),
  });
  // Verify task belongs to the specified project
  if (task.project.id !== props.projectId) {
    throw new HttpException("Not Found", 404);
  }
  // Check for soft deletion - return 404 if task is deleted
  if (task.deleted_at !== null) {
    throw new HttpException("Not Found", 404);
  }
  // Transform database record to DTO (handles date conversion and nested relations)
  return await HrmPlatformTaskTransformer.transform(task);
}
