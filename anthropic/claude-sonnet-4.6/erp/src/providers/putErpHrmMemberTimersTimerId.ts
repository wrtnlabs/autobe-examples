import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IErpHrmDepartment } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmDepartment";
import { IErpHrmMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmMember";
import { IErpHrmOrganizationMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmOrganizationMember";
import { IErpHrmProject } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmProject";
import { IErpHrmRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmRole";
import { IErpHrmRolePermission } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmRolePermission";
import { IErpHrmTask } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTask";
import { IErpHrmTimer } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimer";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { MemberPayload } from "../decorators/payload/MemberPayload";
import { ErpHrmTimerTransformer } from "../transformers/ErpHrmTimerTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function putErpHrmMemberTimersTimerId(props: {
  member: MemberPayload;
  timerId: string & tags.Format<"uuid">;
  body: IErpHrmTimer.IUpdate;
}): Promise<IErpHrmTimer> {
  // Step 1: Load the timer record — auto-404 if not found
  const timer = await MyGlobal.prisma.erp_hrm_timers.findUniqueOrThrow({
    where: { id: props.timerId },
    select: {
      id: true,
      organization_member_id: true,
      project_id: true,
      task_id: true,
    },
  });
  // Step 2: Verify ownership — the timer's organization_member must belong to the authenticated member
  const orgMember =
    await MyGlobal.prisma.erp_hrm_organization_members.findFirst({
      where: {
        id: timer.organization_member_id,
        member_id: props.member.id,
      },
      select: { id: true },
    });
  if (orgMember === null) {
    throw new HttpException("Forbidden: you do not own this timer", 403);
  }
  // Step 3: Determine whether the project is changing and the effective project id
  const projectChanged =
    props.body.projectId !== undefined &&
    props.body.projectId !== timer.project_id;
  const effectiveProjectId: string = props.body.projectId ?? timer.project_id;
  // Step 4: If project changes, verify the member has an active project membership
  if (projectChanged) {
    const membership = await MyGlobal.prisma.erp_hrm_project_members.findFirst({
      where: {
        organization_member_id: timer.organization_member_id,
        project_id: effectiveProjectId,
      },
      select: { id: true },
    });
    if (membership === null) {
      throw new HttpException(
        "Forbidden: you are not a member of the specified project",
        403,
      );
    }
  }
  // Step 5: Compute final task_id
  let finalTaskId: string | null;
  if (props.body.taskId === null) {
    finalTaskId = null;
  } else if (props.body.taskId !== undefined) {
    const task = await MyGlobal.prisma.erp_hrm_tasks.findFirst({
      where: {
        id: props.body.taskId,
        project: { id: effectiveProjectId },
      },
      select: { id: true },
    });
    if (task === null) {
      throw new HttpException(
        "Unprocessable Entity: task does not belong to the effective project",
        422,
      );
    }
    finalTaskId = props.body.taskId;
  } else if (projectChanged) {
    finalTaskId = null;
  } else {
    finalTaskId = timer.task_id;
  }
  // Step 6: Apply update
  await MyGlobal.prisma.erp_hrm_timers.update({
    where: { id: props.timerId },
    data: {
      ...(props.body.projectId !== undefined && {
        project_id: props.body.projectId,
      }),
      task_id: finalTaskId,
      ...(props.body.description !== undefined && {
        description: props.body.description,
      }),
    },
  });
  // Step 7: Fetch the updated record and transform to response DTO
  const updated = await MyGlobal.prisma.erp_hrm_timers.findUniqueOrThrow({
    where: { id: props.timerId },
    ...ErpHrmTimerTransformer.select(),
  });
  return await ErpHrmTimerTransformer.transform(updated);
}
