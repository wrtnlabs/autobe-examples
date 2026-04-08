import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IErpHrmDepartment } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmDepartment";
import { IErpHrmEmployee } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmEmployee";
import { IErpHrmMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmMember";
import { IErpHrmOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmOrganization";
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
  // Step 1: Resolve employee from member session
  const employee = await MyGlobal.prisma.erp_hrm_employees.findFirst({
    where: {
      erp_hrm_member_id: props.member.id,
      status: "active",
      deleted_at: null,
    },
    select: {
      id: true,
      erp_hrm_member_id: true,
      erp_hrm_organization_id: true,
      status: true,
    },
  });
  if (employee === null) {
    throw new HttpException(
      "No active employee found for this member. Please contact your administrator.",
      400,
    );
  }
  // Step 2: Check for existing active timer
  const existingTimer = await MyGlobal.prisma.erp_hrm_timers.findUnique({
    where: {
      erp_hrm_employee_id: employee.id,
    },
  });
  if (existingTimer !== null) {
    throw new HttpException(
      "An active timer already exists. Please stop or discard your current timer before starting a new one.",
      409,
    );
  }
  // Step 3: Verify project membership
  const projectMembership =
    await MyGlobal.prisma.erp_hrm_project_members.findUnique({
      where: {
        erp_hrm_employee_id_erp_hrm_project_id: {
          erp_hrm_employee_id: employee.id,
          erp_hrm_project_id: props.body.erpHrmProjectId,
        },
      },
    });
  if (projectMembership === null) {
    throw new HttpException(
      "You are not a member of this project. Please join the project before starting a timer.",
      400,
    );
  }
  // Step 4: Verify task belongs to project (if task provided)
  if (
    props.body.erpHrmTaskId !== undefined &&
    props.body.erpHrmTaskId !== null
  ) {
    const task = await MyGlobal.prisma.erp_hrm_tasks.findUnique({
      where: {
        id: props.body.erpHrmTaskId,
      },
      select: {
        id: true,
        erp_hrm_project_id: true,
      },
    });
    if (task === null) {
      throw new HttpException("The specified task does not exist.", 400);
    }
    if (task.erp_hrm_project_id !== props.body.erpHrmProjectId) {
      throw new HttpException(
        "The specified task does not belong to the selected project.",
        400,
      );
    }
  }
  // Step 5: Create timer with collector
  const timerEntity: IEntity = {
    id: employee.id,
  } satisfies IEntity;
  const created = await MyGlobal.prisma.erp_hrm_timers.create({
    data: await ErpHrmTimerCollector.collect({
      body: props.body,
      employee: timerEntity,
    }),
    ...ErpHrmTimerTransformer.select(),
  });
  return await ErpHrmTimerTransformer.transform(created);
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
// import { IErpHrmOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmOrganization";
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