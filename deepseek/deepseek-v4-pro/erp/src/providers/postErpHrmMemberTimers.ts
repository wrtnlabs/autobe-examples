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
  const session =
    await MyGlobal.prisma.erp_hrm_member_sessions.findUniqueOrThrow({
      where: { id: props.member.session_id },
      select: { id: true, erp_hrm_organization_id: true },
    });
  if (session.erp_hrm_organization_id === null) {
    throw new HttpException("No organization selected", 400);
  }
  const employee = await MyGlobal.prisma.erp_hrm_employees.findFirst({
    where: {
      erp_hrm_member_id: props.member.id,
      erp_hrm_organization_id: session.erp_hrm_organization_id,
      deleted_at: null,
    },
    select: { id: true },
  });
  if (employee === null) {
    throw new HttpException("Employee record not found", 404);
  }
  const existingTimer = await MyGlobal.prisma.erp_hrm_timers.findUnique({
    where: { erp_hrm_employee_id: employee.id },
    select: { id: true },
  });
  if (existingTimer !== null) {
    throw new HttpException("Timer already running", 409);
  }
  const projectMember = await MyGlobal.prisma.erp_hrm_project_members.findFirst(
    {
      where: {
        erp_hrm_employee_id: employee.id,
        erp_hrm_project_id: props.body.erp_hrm_project_id,
        deleted_at: null,
      },
      select: { id: true },
    },
  );
  if (projectMember === null) {
    throw new HttpException("Not a project member", 403);
  }
  if (props.body.erp_hrm_task_id) {
    const task = await MyGlobal.prisma.erp_hrm_tasks.findUniqueOrThrow({
      where: { id: props.body.erp_hrm_task_id },
      select: { id: true, erp_hrm_project_id: true },
    });
    if (task.erp_hrm_project_id !== props.body.erp_hrm_project_id) {
      throw new HttpException(
        "Task does not belong to the specified project",
        400,
      );
    }
  }
  const record = await MyGlobal.prisma.erp_hrm_timers.create({
    data: await ErpHrmTimerCollector.collect({
      body: props.body,
      erpHrmEmployees: { id: employee.id },
      erpHrmMemberSessions: { id: session.id },
    }),
    ...ErpHrmTimerTransformer.select(),
  });
  return await ErpHrmTimerTransformer.transform(record);
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
// import { IErpHrmEmployee } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmEmployee";
// import { IErpHrmMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmMember";
// import { IErpHrmRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmRole";
// import { IErpHrmDepartment } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmDepartment";
// import { IErpHrmProject } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmProject";
// import { IErpHrmTask } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTask";
// 
// // DON'T CHANGE FUNCTION NAME AND PARAMETERS,
// // ONLY YOU HAVE TO WRITE THIS FUNCTION BODY, AND USE IMPORTED.
// export async function postErpHrmMemberTimers(props: {
//   member: MemberPayload;
//   body: IErpHrmTimer.ICreate;
// }): Promise<IErpHrmTimer> {
//   const record = await MyGlobal.prisma.erp_hrm_timers.create({
//     data: await ErpHrmTimerCollector.collect({
//       body: props.body,
//       ...
//     }),
//     ...ErpHrmTimerTransformer.select(),
//   });
//   return await ErpHrmTimerTransformer.transform(record);
// }
// ```
//--------------------------------------------------------------