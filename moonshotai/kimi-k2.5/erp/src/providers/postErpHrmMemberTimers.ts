import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IErpHrmDepartment } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmDepartment";
import { IErpHrmMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmMember";
import { IErpHrmOrganizationMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmOrganizationMember";
import { IErpHrmProject } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmProject";
import { IErpHrmRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmRole";
import { IErpHrmTask } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTask";
import { IErpHrmTimer } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimer";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { ErpHrmTimerCollector } from "../collectors/ErpHrmTimerCollector";
import { MemberPayload } from "../decorators/payload/MemberPayload";
import { ErpHrmTimerTransformer } from "../transformers/ErpHrmTimerTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function postErpHrmMemberTimers(props: {
  member: MemberPayload;
  body: IErpHrmTimer.ICreate;
}): Promise<IErpHrmTimer> {
  // 1. Single Active Timer Check
  const existingTimer = await MyGlobal.prisma.erp_hrm_timers.findFirst({
    where: {
      organization_member_id: props.member.id,
    },
  });
  if (existingTimer !== null) {
    throw new HttpException("Employee already has an active timer", 409);
  }
  // 2. Project Membership Validation
  const projectMembership =
    await MyGlobal.prisma.erp_hrm_project_members.findFirst({
      where: {
        project_id: props.body.projectId,
        organization_member_id: props.member.id,
      },
    });
  if (projectMembership === null) {
    throw new HttpException(
      "Employee is not a member of the specified project",
      403,
    );
  }
  // 3. Task Validation (if provided)
  if (props.body.taskId !== undefined && props.body.taskId !== null) {
    const task = await MyGlobal.prisma.erp_hrm_tasks.findUnique({
      where: { id: props.body.taskId },
      select: { project_id: true },
    });
    if (task === null) {
      throw new HttpException("Task not found", 404);
    }
    if (task.project_id !== props.body.projectId) {
      throw new HttpException(
        "Task does not belong to the specified project",
        400,
      );
    }
  }
  // 4. Timer Creation using Collector and Transformer
  const created = await MyGlobal.prisma.erp_hrm_timers.create({
    data: await ErpHrmTimerCollector.collect({
      body: props.body,
      erpHrmOrganizationMembers: { id: props.member.id },
    }),
    ...ErpHrmTimerTransformer.select(),
  });
  return await ErpHrmTimerTransformer.transform(created);
}
