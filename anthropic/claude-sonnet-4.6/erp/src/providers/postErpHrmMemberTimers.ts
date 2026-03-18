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
import { ErpHrmTimerCollector } from "../collectors/ErpHrmTimerCollector";
import { MemberPayload } from "../decorators/payload/MemberPayload";
import { ErpHrmTimerTransformer } from "../transformers/ErpHrmTimerTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function postErpHrmMemberTimers(props: {
  member: MemberPayload;
  body: IErpHrmTimer.ICreate;
}): Promise<IErpHrmTimer> {
  // Step 1: Validate the project exists and is not soft-deleted
  const project = await MyGlobal.prisma.erp_hrm_projects.findFirst({
    where: {
      id: props.body.project_id,
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
  // Step 2: Find the project member record for the authenticated user
  // This simultaneously validates project membership and resolves organization_member_id
  const projectMember = await MyGlobal.prisma.erp_hrm_project_members.findFirst(
    {
      where: {
        project_id: props.body.project_id,
        deleted_at: null,
        organizationMember: {
          member_id: props.member.id,
          status: "active",
          organization_id: project.organization_id,
        },
      },
      select: {
        id: true,
        organization_member_id: true,
      },
    },
  );
  if (projectMember === null) {
    throw new HttpException("Forbidden: not a project member", 403);
  }
  const organizationMemberId = projectMember.organization_member_id;
  // Step 3: Check if the member already has an active timer (unique constraint)
  const existingTimer = await MyGlobal.prisma.erp_hrm_timers.findUnique({
    where: { organization_member_id: organizationMemberId },
    select: { id: true },
  });
  if (existingTimer !== null) {
    throw new HttpException(
      "Conflict: member already has an active timer",
      409,
    );
  }
  // Step 4: If task_id is provided, validate it belongs to the given project
  if (props.body.task_id != null) {
    const task = await MyGlobal.prisma.erp_hrm_tasks.findFirst({
      where: {
        id: props.body.task_id,
        erp_hrm_project_id: props.body.project_id,
        deleted_at: null,
      },
      select: { id: true },
    });
    if (task === null) {
      throw new HttpException(
        "Unprocessable: task does not belong to the given project",
        422,
      );
    }
  }
  // Step 5: Create the timer using the collector
  const created = await MyGlobal.prisma.erp_hrm_timers.create({
    data: await ErpHrmTimerCollector.collect({
      body: props.body,
      erpHrmOrganizationMembers: { id: organizationMemberId },
      erpHrmMemberSessions: { id: props.member.session_id },
    }),
    ...ErpHrmTimerTransformer.select(),
  });
  // Step 6: Transform and return the result
  return ErpHrmTimerTransformer.transform(created);
}
