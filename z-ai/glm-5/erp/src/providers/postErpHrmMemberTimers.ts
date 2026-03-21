import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IErpHrmDepartment } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmDepartment";
import { IErpHrmEmployee } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmEmployee";
import { IErpHrmMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmMember";
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
  // Get session for organization context
  const session =
    await MyGlobal.prisma.erp_hrm_member_sessions.findUniqueOrThrow({
      where: { id: props.member.session_id },
      select: { erp_hrm_organization_id: true },
    });
  // Validate session has organization context
  if (!session.erp_hrm_organization_id) {
    throw new HttpException("Session has no organization context", 400);
  }
  // Find employee record for this member in the organization
  const employee = await MyGlobal.prisma.erp_hrm_employees.findFirstOrThrow({
    where: {
      erp_hrm_member_id: props.member.id,
      erp_hrm_organization_id: session.erp_hrm_organization_id,
    },
    select: { id: true, status: true },
  });
  // Validate employee is active
  if (employee.status !== "active") {
    throw new HttpException("Deactivated employees cannot start timers", 403);
  }
  // Check for existing active timer
  const existingTimer = await MyGlobal.prisma.erp_hrm_timers.findFirst({
    where: {
      erp_hrm_employee_id: employee.id,
      deleted_at: null,
    },
  });
  if (existingTimer) {
    throw new HttpException(
      "An active timer already exists for this employee",
      409,
    );
  }
  // Validate project membership
  const projectMember = await MyGlobal.prisma.erp_hrm_project_members.findFirst(
    {
      where: {
        erp_hrm_employee_id: employee.id,
        erp_hrm_project_id: props.body.project_id,
        deleted_at: null,
      },
    },
  );
  if (!projectMember) {
    throw new HttpException("Employee is not assigned to this project", 400);
  }
  // Validate project is active
  const project = await MyGlobal.prisma.erp_hrm_projects.findUniqueOrThrow({
    where: { id: props.body.project_id },
    select: { status: true },
  });
  if (project.status !== "active") {
    throw new HttpException("Project is not active", 400);
  }
  // If task_id provided, validate it belongs to the same project
  if (props.body.task_id) {
    const task = await MyGlobal.prisma.erp_hrm_tasks.findUnique({
      where: { id: props.body.task_id },
      select: { project_id: true },
    });
    if (!task || task.project_id !== props.body.project_id) {
      throw new HttpException(
        "Task does not belong to the specified project",
        400,
      );
    }
  }
  // Create timer using collector
  const created = await MyGlobal.prisma.erp_hrm_timers.create({
    data: await ErpHrmTimerCollector.collect({
      body: props.body,
      employee: { id: employee.id },
    }),
    ...ErpHrmTimerTransformer.select(),
  });
  return await ErpHrmTimerTransformer.transform(created);
}
