import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IErpHrmDepartment } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmDepartment";
import { IErpHrmEmployee } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmEmployee";
import { IErpHrmMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmMember";
import { IErpHrmOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmOrganization";
import { IErpHrmProjectMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmProjectMember";
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

export async function postErpHrmMemberTimersStart(props: {
  member: MemberPayload;
  body: IErpHrmTimer.ICreate;
}): Promise<IErpHrmTimer> {
  // 1. Find the employee by member ID from authenticated session
  const employee = await MyGlobal.prisma.erp_hrm_employees.findFirst({
    where: {
      erp_hrm_member_id: props.member.id,
      deleted_at: null,
    },
    select: {
      id: true,
      status: true,
    },
  });
  if (!employee) {
    throw new HttpException("Employee not found", 404);
  }
  // 2. Validate employee is active - deactivated employees cannot start timers
  if (employee.status !== "active") {
    throw new HttpException("Deactivated employees cannot start timers", 403);
  }
  // 3. Check for existing active timer - single active timer constraint
  const existingTimer = await MyGlobal.prisma.erp_hrm_timers.findUnique({
    where: { erp_hrm_employee_id: employee.id },
    select: { id: true },
  });
  if (existingTimer) {
    throw new HttpException(
      "An active timer already exists. Please stop or discard the existing timer first.",
      409,
    );
  }
  // 4. Validate project exists and employee is assigned to it as project member
  const projectMembership =
    await MyGlobal.prisma.erp_hrm_project_members.findUnique({
      where: {
        erp_hrm_employee_id_erp_hrm_project_id: {
          erp_hrm_employee_id: employee.id,
          erp_hrm_project_id: props.body.erp_hrm_project_id,
        },
      },
      select: { id: true },
    });
  if (!projectMembership) {
    throw new HttpException(
      "Project not found or employee not assigned to this project",
      400,
    );
  }
  // 5. If taskId is provided, validate task exists and belongs to the selected project
  if (props.body.erp_hrm_task_id) {
    const task = await MyGlobal.prisma.erp_hrm_tasks.findUnique({
      where: { id: props.body.erp_hrm_task_id },
      select: { id: true, erp_hrm_project_id: true },
    });
    if (!task) {
      throw new HttpException("Task not found", 404);
    }
    if (task.erp_hrm_project_id !== props.body.erp_hrm_project_id) {
      throw new HttpException(
        "Task does not belong to the selected project",
        400,
      );
    }
  }
  // 6. Create the timer with collector and return using transformer
  const created = await MyGlobal.prisma.erp_hrm_timers.create({
    data: await ErpHrmTimerCollector.collect({
      body: props.body,
      erpHrmEmployees: { id: employee.id },
      erpHrmMemberSessions: { id: props.member.session_id },
    }),
    ...ErpHrmTimerTransformer.select(),
  });
  return await ErpHrmTimerTransformer.transform(created);
}
