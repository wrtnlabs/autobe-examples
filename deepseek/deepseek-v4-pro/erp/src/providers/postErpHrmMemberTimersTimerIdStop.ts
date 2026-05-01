import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IErpHrmDepartment } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmDepartment";
import { IErpHrmEmployee } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmEmployee";
import { IErpHrmMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmMember";
import { IErpHrmProject } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmProject";
import { IErpHrmRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmRole";
import { IErpHrmTask } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTask";
import { IErpHrmTimelog } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimelog";
import { IErpHrmTimesheet } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimesheet";
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

export async function postErpHrmMemberTimersTimerIdStop(props: {
  member: MemberPayload;
  timerId: string & tags.Format<"uuid">;
}): Promise<IErpHrmTimelog> {
  const timer = await MyGlobal.prisma.erp_hrm_timers.findUniqueOrThrow({
    where: { id: props.timerId },
    select: {
      id: true,
      erp_hrm_employee_id: true,
      erp_hrm_project_id: true,
      erp_hrm_task_id: true,
      start_timestamp: true,
      description: true,
      employee: {
        select: {
          erp_hrm_member_id: true,
        },
      },
    },
  });
  if (timer.employee.erp_hrm_member_id !== props.member.id) {
    throw new HttpException("Forbidden", 403);
  }
  const nowMs: number = Date.now();
  const startMs: number = timer.start_timestamp.getTime();
  const elapsedMs: number = nowMs - startMs;
  const durationMinutes: number = Math.round(elapsedMs / 60000);
  const timelogId: string = v4();
  await MyGlobal.prisma.erp_hrm_timelogs.create({
    data: {
      id: timelogId,
      employee_id: timer.erp_hrm_employee_id,
      project_id: timer.erp_hrm_project_id,
      task_id: timer.erp_hrm_task_id,
      date: new Date(),
      duration_minutes: durationMinutes,
      description: timer.description,
      billable: true,
      timesheet_id: null,
      created_at: new Date(),
      updated_at: new Date(),
      deleted_at: null,
    },
  });
  await MyGlobal.prisma.erp_hrm_timers.delete({
    where: { id: props.timerId },
  });
  const created = await MyGlobal.prisma.erp_hrm_timelogs.findUniqueOrThrow({
    where: { id: timelogId },
    ...ErpHrmTimelogTransformer.select(),
  });
  return await ErpHrmTimelogTransformer.transform(created);
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
// import { IErpHrmTimelog } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimelog";
// import { IErpHrmEmployee } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmEmployee";
// import { IErpHrmMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmMember";
// import { IErpHrmRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmRole";
// import { IErpHrmDepartment } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmDepartment";
// import { IErpHrmProject } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmProject";
// import { IErpHrmTask } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTask";
// import { IErpHrmTimesheet } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimesheet";
// 
// // DON'T CHANGE FUNCTION NAME AND PARAMETERS,
// // ONLY YOU HAVE TO WRITE THIS FUNCTION BODY, AND USE IMPORTED.
// export async function postErpHrmMemberTimersTimerIdStop(props: {
//   member: MemberPayload;
//   timerId: string & tags.Format<"uuid">;
// }): Promise<IErpHrmTimelog> {
//   const record = await MyGlobal.prisma.erp_hrm_timelogs.findFirstOrThrow({
//     ...ErpHrmTimelogTransformer.select(),
//     where: { ... },
//   });
//   return await ErpHrmTimelogTransformer.transform(record);
// }
// ```
//--------------------------------------------------------------