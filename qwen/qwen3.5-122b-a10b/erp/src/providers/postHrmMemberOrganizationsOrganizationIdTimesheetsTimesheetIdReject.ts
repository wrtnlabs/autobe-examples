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
import { MemberPayload } from "../decorators/payload/MemberPayload";
import { HrmTimesheetTimelogTransformer } from "../transformers/HrmTimesheetTimelogTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function postHrmMemberOrganizationsOrganizationIdTimesheetsTimesheetIdReject(props: {
  member: MemberPayload;
  organizationId: string & tags.Format<"uuid">;
  timesheetId: string & tags.Format<"uuid">;
  body: IHrmTimesheetTimelog.IReject;
}): Promise<IHrmTimesheetTimelog> {
  // 1. Validate rejection reason is provided and non-empty (section 301)
  if (
    props.body.rejection_reason === null ||
    props.body.rejection_reason === undefined ||
    props.body.rejection_reason.trim().length === 0
  ) {
    throw new HttpException("Rejection reason is required", 400);
  }
  // 2. Find the timesheet with employee relation to verify organization
  const timesheet = await MyGlobal.prisma.hrm_timesheets.findUniqueOrThrow({
    ...HrmTimesheetTimelogTransformer.select(),
    where: {
      id: props.timesheetId,
      deleted_at: null,
    },
  });
  // 3. Verify timesheet belongs to the specified organization
  if (timesheet.employee.organization.id !== props.organizationId) {
    throw new HttpException(
      "Timesheet does not belong to this organization",
      403,
    );
  }
  // 4. Verify timesheet status is 'submitted' (cannot reject draft, approved, or rejected)
  if (timesheet.status !== "submitted") {
    throw new HttpException("Only submitted timesheets can be rejected", 400);
  }
  // 5. Update timesheet with rejection details
  await MyGlobal.prisma.hrm_timesheets.update({
    where: { id: props.timesheetId },
    data: {
      status: "rejected",
      reviewed_by: props.member.id,
      reviewed_at: new Date(),
      rejection_reason: props.body.rejection_reason,
    },
  });
  // 6. Fetch updated timesheet using transformer select
  const updated = await MyGlobal.prisma.hrm_timesheets.findUniqueOrThrow({
    where: { id: props.timesheetId },
    ...HrmTimesheetTimelogTransformer.select(),
  });
  // 7. Transform and return
  return await HrmTimesheetTimelogTransformer.transform(updated);
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
// export async function postHrmMemberOrganizationsOrganizationIdTimesheetsTimesheetIdReject(props: {
//   member: MemberPayload;
//   organizationId: string & tags.Format<"uuid">;
//   timesheetId: string & tags.Format<"uuid">;
//   body: IHrmTimesheetTimelog.IReject;
// }): Promise<IHrmTimesheetTimelog> {
//   const record = await MyGlobal.prisma.hrm_timesheets.findFirstOrThrow({
//     ...HrmTimesheetTimelogTransformer.select(),
//     where: { ... },
//   });
//   return await HrmTimesheetTimelogTransformer.transform(record);
// }
// ```
//--------------------------------------------------------------