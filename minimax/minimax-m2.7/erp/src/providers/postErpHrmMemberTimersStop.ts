import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IErpHrmDepartment } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmDepartment";
import { IErpHrmEmployee } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmEmployee";
import { IErpHrmMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmMember";
import { IErpHrmOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmOrganization";
import { IErpHrmProject } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmProject";
import { IErpHrmRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmRole";
import { IErpHrmTask } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTask";
import { IErpHrmTimelog } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimelog";
import { IErpHrmTimer } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimer";
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
  body: IErpHrmTimer.IStop;
}): Promise<IErpHrmTimelog> {
  // Get employee from member session
  const employee = await MyGlobal.prisma.erp_hrm_employees.findFirst({
    select: { id: true, status: true },
    where: { erp_hrm_member_id: props.member.id, deleted_at: null },
  });
  if (!employee) {
    throw new HttpException("Employee not found", 404);
  }
  // Check if employee is active
  if (employee.status === "deactivated") {
    throw new HttpException(
      "Deactivated employees cannot perform timer operations",
      403,
    );
  }
  // Get active timer for this employee
  const timer = await MyGlobal.prisma.erp_hrm_timers.findFirst({
    where: { erp_hrm_employee_id: employee.id },
  });
  if (!timer) {
    throw new HttpException("No active timer found", 404);
  }
  // Calculate duration in minutes with rounding
  const nowMs = Date.now();
  const startedAtMs = timer.started_at.getTime();
  const diffMs = nowMs - startedAtMs;
  const totalSeconds = Math.floor(diffMs / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  const durationMinutes = seconds >= 30 ? minutes + 1 : minutes;
  // Discard timer without creating timelog
  if (props.body.discard === true) {
    await MyGlobal.prisma.erp_hrm_timers.delete({
      where: { id: timer.id },
    });
    throw new HttpException("Timer discarded", 204);
  }
  // Create current timestamp ISO string
  const nowIso = new Date().toISOString();
  const todayDate = nowIso.substring(0, 10) + "T00:00:00.000Z";
  // Create timelog and delete timer in transaction
  const created = await MyGlobal.prisma.$transaction(async (tx) => {
    const timelog = await tx.erp_hrm_timelogs.create({
      data: {
        id: v4() as string & tags.Format<"uuid">,
        erp_hrm_employee_id: timer.erp_hrm_employee_id,
        erp_hrm_project_id: timer.erp_hrm_project_id,
        erp_hrm_task_id: timer.erp_hrm_task_id,
        date: new Date(todayDate),
        duration_minutes: durationMinutes,
        description: timer.description,
        billable: true,
        created_at: new Date(nowIso),
        updated_at: new Date(nowIso),
      },
    });
    await tx.erp_hrm_timers.delete({
      where: { id: timer.id },
    });
    return timelog;
  });
  // Fetch timelog with relations for response
  const timelogWithRelations =
    await MyGlobal.prisma.erp_hrm_timelogs.findUniqueOrThrow({
      where: { id: created.id },
      ...ErpHrmTimelogTransformer.select(),
    });
  return await ErpHrmTimelogTransformer.transform(timelogWithRelations);
}


//--------------------------------------------------------------
// TEMPLATE CODE
//--------------------------------------------------------------
// Complete the code below, disregard the import part and return only the function part.
// 
// ```typescript
// import { ArrayUtil } from "@nestia/e2e";
// import { HttpException } from "@nestjs/common";
// import { Prisma } from "@prisma/sdk";
// import jwt from "jsonwebtoken";
// import typia, { tags } from "typia";
// import { v4 } from "uuid";
// import { MyGlobal } from "../MyGlobal";
// import { PasswordUtil } from "../utils/PasswordUtil";
// import { toISOStringSafe } from "../utils/toISOStringSafe"
// 
// import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
// import { IErpHrmTimer } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimer";
// import { IErpHrmTimelog } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimelog";
// import { IErpHrmEmployee } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmEmployee";
// import { IErpHrmMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmMember";
// import { IErpHrmRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmRole";
// import { IErpHrmOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmOrganization";
// import { IErpHrmDepartment } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmDepartment";
// import { IErpHrmProject } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmProject";
// import { IErpHrmTask } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTask";
// 
// // DON'T CHANGE FUNCTION NAME AND PARAMETERS,
// // ONLY YOU HAVE TO WRITE THIS FUNCTION BODY, AND USE IMPORTED.
// export async function postErpHrmMemberTimersStop(props: {
//   member: MemberPayload;
//   body: IErpHrmTimer.IStop;
// }): Promise<IErpHrmTimelog> {
//   const record = await MyGlobal.prisma.erp_hrm_timelogs.findFirstOrThrow({
//     ...ErpHrmTimelogTransformer.select(),
//     where: { ... },
//   });
//   return await ErpHrmTimelogTransformer.transform(record);
// }
// ```
//--------------------------------------------------------------