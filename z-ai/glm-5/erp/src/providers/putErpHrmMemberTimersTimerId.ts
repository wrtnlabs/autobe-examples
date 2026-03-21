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
import { MemberPayload } from "../decorators/payload/MemberPayload";
import { ErpHrmTimerTransformer } from "../transformers/ErpHrmTimerTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function putErpHrmMemberTimersTimerId(props: {
  member: MemberPayload;
  timerId: string & tags.Format<"uuid">;
  body: IErpHrmTimer.IUpdate;
}): Promise<IErpHrmTimer> {
  // Get session to find current organization context
  const session =
    await MyGlobal.prisma.erp_hrm_member_sessions.findUniqueOrThrow({
      where: { id: props.member.session_id },
      select: { erp_hrm_organization_id: true },
    });
  if (session.erp_hrm_organization_id === null) {
    throw new HttpException("No organization context selected", 400);
  }
  // Get employee record for member in current organization
  const employee = await MyGlobal.prisma.erp_hrm_employees.findUniqueOrThrow({
    where: {
      erp_hrm_member_id_erp_hrm_organization_id: {
        erp_hrm_member_id: props.member.id,
        erp_hrm_organization_id: session.erp_hrm_organization_id,
      },
    },
    select: { id: true, status: true },
  });
  // Verify employee is active (not deactivated)
  if (employee.status !== "active") {
    throw new HttpException("Employee is deactivated", 403);
  }
  // Load timer with current project reference
  const timer = await MyGlobal.prisma.erp_hrm_timers.findUniqueOrThrow({
    where: { id: props.timerId },
    select: {
      id: true,
      erp_hrm_employee_id: true,
      erp_hrm_project_id: true,
      deleted_at: true,
    },
  });
  // Verify timer ownership
  if (timer.erp_hrm_employee_id !== employee.id) {
    throw new HttpException("Forbidden", 403);
  }
  // Verify timer is still active (running)
  if (timer.deleted_at !== null) {
    throw new HttpException("Timer is not active", 400);
  }
  // Determine effective project ID
  const effectiveProjectId =
    props.body.erp_hrm_project_id !== undefined
      ? props.body.erp_hrm_project_id
      : timer.erp_hrm_project_id;
  // If project changed, verify employee is a project member
  if (
    props.body.erp_hrm_project_id !== undefined &&
    props.body.erp_hrm_project_id !== timer.erp_hrm_project_id
  ) {
    const membership = await MyGlobal.prisma.erp_hrm_project_members.findFirst({
      where: {
        erp_hrm_employee_id: employee.id,
        erp_hrm_project_id: props.body.erp_hrm_project_id,
        deleted_at: null,
      },
    });
    if (membership === null) {
      throw new HttpException(
        "You are not a member of the specified project",
        400,
      );
    }
  }
  // If task specified, verify it belongs to the project
  if (
    props.body.erp_hrm_task_id !== undefined &&
    props.body.erp_hrm_task_id !== null
  ) {
    const task = await MyGlobal.prisma.erp_hrm_tasks.findFirst({
      where: {
        id: props.body.erp_hrm_task_id,
        project_id: effectiveProjectId,
        deleted_at: null,
      },
    });
    if (task === null) {
      throw new HttpException("Task not found in the specified project", 400);
    }
  }
  // Build update data conditionally
  const data: {
    erp_hrm_project_id?: string;
    erp_hrm_task_id?: string | null;
    description?: string | null;
    updated_at: Date;
  } = {
    updated_at: new Date(),
  };
  if (props.body.erp_hrm_project_id !== undefined) {
    data.erp_hrm_project_id = props.body.erp_hrm_project_id;
  }
  if (props.body.erp_hrm_task_id !== undefined) {
    data.erp_hrm_task_id = props.body.erp_hrm_task_id;
  }
  if (props.body.description !== undefined) {
    data.description = props.body.description;
  }
  // Update timer
  await MyGlobal.prisma.erp_hrm_timers.update({
    where: { id: props.timerId },
    data,
  });
  // Fetch updated timer with relations using transformer select
  const updated = await MyGlobal.prisma.erp_hrm_timers.findUniqueOrThrow({
    where: { id: props.timerId },
    ...ErpHrmTimerTransformer.select(),
  });
  return ErpHrmTimerTransformer.transform(updated);
}
