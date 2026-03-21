import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IErpHrmDepartment } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmDepartment";
import { IErpHrmEmployee } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmEmployee";
import { IErpHrmMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmMember";
import { IErpHrmOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmOrganization";
import { IErpHrmProjectMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmProjectMember";
import { IErpHrmRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmRole";
import { IErpHrmTask } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTask";
import { IErpHrmTimelog } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimelog";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { MemberPayload } from "../decorators/payload/MemberPayload";
import { ErpHrmTimelogTransformer } from "../transformers/ErpHrmTimelogTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function postErpHrmMemberTimersStop(props: {
  member: MemberPayload;
}): Promise<IErpHrmTimelog> {
  // 1. Retrieve the authenticated employee from session context
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
  // 2. Verify employee status is active (not deactivated)
  if (employee.status !== "active") {
    throw new HttpException(
      "Deactivated employees cannot perform timer operations",
      403,
    );
  }
  // 3. Find the active timer belonging to the employee
  const timer = await MyGlobal.prisma.erp_hrm_timers.findUnique({
    where: {
      erp_hrm_employee_id: employee.id,
    },
    select: {
      id: true,
      erp_hrm_employee_id: true,
      erp_hrm_project_id: true,
      erp_hrm_task_id: true,
      started_at: true,
      description: true,
    },
  });
  // 4. If no active timer found, return error
  if (!timer) {
    throw new HttpException("NO_ACTIVE_TIMER", 400);
  }
  // 5. Calculate duration: current_timestamp - timer.started_at
  const now = new Date();
  const startedAt = timer.started_at;
  const durationMs = now.getTime() - startedAt.getTime();
  // 6. Round duration to nearest minute (0-29 seconds rounds down to 0, 30+ seconds rounds up)
  const durationMinutes = Math.round(durationMs / (1000 * 60));
  // 7. Create timelog record
  const createdTimelog = await MyGlobal.prisma.erp_hrm_timelogs.create({
    data: {
      id: v4() as string & tags.Format<"uuid">,
      erp_hrm_employee_id: timer.erp_hrm_employee_id,
      erp_hrm_project_id: timer.erp_hrm_project_id,
      erp_hrm_task_id: timer.erp_hrm_task_id,
      date: startedAt,
      duration_minutes: durationMinutes,
      description: timer.description,
      billable: true,
      created_at: now,
      updated_at: now,
    },
    ...ErpHrmTimelogTransformer.select(),
  });
  // 8. Delete the timer record (cascade handles cleanup)
  await MyGlobal.prisma.erp_hrm_timers.delete({
    where: { id: timer.id },
  });
  // 9. Return the created timelog with full details
  return await ErpHrmTimelogTransformer.transform(createdTimelog);
}
