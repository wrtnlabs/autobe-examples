import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IHrmDepartment } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmDepartment";
import { IHrmEmployee } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmEmployee";
import { IHrmMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmMember";
import { IHrmOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmOrganization";
import { IHrmProject } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmProject";
import { IHrmRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmRole";
import { IHrmTask } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTask";
import { IHrmTimeReportItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeReportItem";
import { IHrmTimelog } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimelog";
import { IHrmTimesheetTimelog } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimesheetTimelog";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { HrmTimesheetTimelogCollector } from "../collectors/HrmTimesheetTimelogCollector";
import { MemberPayload } from "../decorators/payload/MemberPayload";
import { HrmTimesheetTimelogTransformer } from "../transformers/HrmTimesheetTimelogTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function postHrmMemberOrganizationsOrganizationIdTimesheets(props: {
  member: {
    id: string & tags.Format<"uuid">;
    session_id: string & tags.Format<"uuid">;
    type: "member";
  };
  organizationId: string & tags.Format<"uuid">;
  body: IHrmTimesheetTimelog.ICreate;
}): Promise<IHrmTimesheetTimelog> {
  // 1. Validate organization exists and is not deleted
  const organization = await MyGlobal.prisma.hrm_organizations.findFirst({
    where: {
      id: props.organizationId,
      deleted_at: null,
    },
  });
  if (organization === null) {
    throw new HttpException("Organization not found", 404);
  }
  // 2. Validate employee exists and belongs to the organization
  const employee = await MyGlobal.prisma.hrm_employees.findFirst({
    where: {
      id: props.body.hrm_employee_id,
      organization_id: props.organizationId,
      deleted_at: null,
    },
  });
  if (employee === null) {
    throw new HttpException(
      "Employee not found or does not belong to this organization",
      404,
    );
  }
  // 3. Check for existing timesheets in submitted/approved status for same employee and week
  const weekStartDate = new Date(props.body.week_start_date);
  const existingTimesheet = await MyGlobal.prisma.hrm_timesheets.findFirst({
    where: {
      hrm_employee_id: props.body.hrm_employee_id,
      week_start_date: weekStartDate,
      status: { in: ["submitted", "approved"] },
      deleted_at: null,
    },
  });
  if (existingTimesheet !== null) {
    throw new HttpException(
      "Timesheet for this week already exists in submitted or approved status",
      409,
    );
  }
  // 4. Create timesheet using collector
  const created = await MyGlobal.prisma.hrm_timesheets.create({
    data: await HrmTimesheetTimelogCollector.collect({
      body: props.body,
      hrmOrganizations: { id: props.organizationId },
      hrmMembers: { id: props.member.id },
    }),
    ...HrmTimesheetTimelogTransformer.select(),
  });
  // 5. Return transformed result
  return await HrmTimesheetTimelogTransformer.transform(created);
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
// import { IHrmTimesheetTimelog } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimesheetTimelog";
// import { IHrmEmployee } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmEmployee";
// import { IHrmMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmMember";
// import { IHrmOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmOrganization";
// import { IHrmRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmRole";
// import { IHrmDepartment } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmDepartment";
// import { IHrmTimelog } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimelog";
// import { IHrmTimeReportItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeReportItem";
// import { IHrmProject } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmProject";
// import { IHrmTask } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTask";
// 
// // DON'T CHANGE FUNCTION NAME AND PARAMETERS,
// // ONLY YOU HAVE TO WRITE THIS FUNCTION BODY, AND USE IMPORTED.
// export async function postHrmMemberOrganizationsOrganizationIdTimesheets(props: {
//   member: MemberPayload;
//   organizationId: string & tags.Format<"uuid">;
//   body: IHrmTimesheetTimelog.ICreate;
// }): Promise<IHrmTimesheetTimelog> {
//   const record = await MyGlobal.prisma.hrm_timesheets.create({
//     data: await HrmTimesheetTimelogCollector.collect({
//       body: props.body,
//       ...
//     }),
//     ...HrmTimesheetTimelogTransformer.select(),
//   });
//   return await HrmTimesheetTimelogTransformer.transform(record);
// }
// ```
//--------------------------------------------------------------