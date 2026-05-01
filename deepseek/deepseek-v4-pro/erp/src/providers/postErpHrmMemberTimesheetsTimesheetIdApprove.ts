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
import { ErpHrmTimesheetTransformer } from "../transformers/ErpHrmTimesheetTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function postErpHrmMemberTimesheetsTimesheetIdApprove(props: {
  member: MemberPayload;
  timesheetId: string & tags.Format<"uuid">;
}): Promise<IErpHrmTimesheet> {
  // ── 1. Retrieve session and organization context ──
  const session =
    await MyGlobal.prisma.erp_hrm_member_sessions.findUniqueOrThrow({
      where: { id: props.member.session_id },
    });
  if (!session.erp_hrm_organization_id) {
    throw new HttpException("No organization selected", 400);
  }
  // ── 2. Lookup timesheet with organization scoping ──
  const timesheet = await MyGlobal.prisma.erp_hrm_timesheets.findUniqueOrThrow({
    where: { id: props.timesheetId },
    select: {
      id: true,
      status: true,
      employee_id: true,
      employee: {
        select: {
          id: true,
          erp_hrm_organization_id: true,
          erp_hrm_member_id: true,
        },
      },
    },
  });
  // ── 3. Organization isolation: timesheet must belong to current org ──
  if (
    timesheet.employee.erp_hrm_organization_id !==
    session.erp_hrm_organization_id
  ) {
    throw new HttpException("Timesheet not found", 404);
  }
  // ── 4. Status validation ──
  if (timesheet.status === "approved") {
    throw new HttpException("Timesheet has already been approved", 409);
  }
  if (timesheet.status === "draft") {
    throw new HttpException(
      "Timesheet must be submitted before it can be approved",
      422,
    );
  }
  if (timesheet.status === "rejected") {
    throw new HttpException(
      "Timesheet must be resubmitted by the employee before approval",
      422,
    );
  }
  // ── 5. Retrieve approver's employee record and role ──
  const approverEmployee =
    await MyGlobal.prisma.erp_hrm_employees.findFirstOrThrow({
      where: {
        erp_hrm_member_id: props.member.id,
        erp_hrm_organization_id: session.erp_hrm_organization_id,
        deleted_at: null,
      },
      select: {
        id: true,
        role: {
          select: {
            name: true,
            is_builtin: true,
            rolePermissions: {
              select: {
                permission: {
                  select: { key: true },
                },
              },
            },
          },
        },
      },
    });
  // ── 6. Self-approval prevention (reviewer ≠ timesheet owner per DTO invariant) ──
  if (timesheet.employee.erp_hrm_member_id === props.member.id) {
    throw new HttpException("Cannot approve your own timesheet", 403);
  }
  // ── 7. Permission check: time:approve ──
  const role = approverEmployee.role;
  const hasTimeApprove = role.is_builtin
    ? role.name === "Owner" || role.name === "Manager"
    : role.rolePermissions.some((rp) => rp.permission.key === "time:approve");
  if (!hasTimeApprove) {
    throw new HttpException("Forbidden", 403);
  }
  // ── 8. Atomic update: approve timesheet ──
  const updated = await MyGlobal.prisma.erp_hrm_timesheets.update({
    where: { id: props.timesheetId },
    data: {
      status: "approved",
      reviewed_by_user_id: props.member.id,
      reviewed_at: new Date(),
      updated_at: new Date(),
    },
    ...ErpHrmTimesheetTransformer.select(),
  });
  // ── 9. Transform and return ──
  return await ErpHrmTimesheetTransformer.transform(updated);
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
// import { IErpHrmTimesheet } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimesheet";
// import { IErpHrmEmployee } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmEmployee";
// import { IErpHrmMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmMember";
// import { IErpHrmRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmRole";
// import { IErpHrmDepartment } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmDepartment";
// import { IErpHrmTimelog } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimelog";
// import { IErpHrmProject } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmProject";
// import { IErpHrmTask } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTask";
// 
// // DON'T CHANGE FUNCTION NAME AND PARAMETERS,
// // ONLY YOU HAVE TO WRITE THIS FUNCTION BODY, AND USE IMPORTED.
// export async function postErpHrmMemberTimesheetsTimesheetIdApprove(props: {
//   member: MemberPayload;
//   timesheetId: string & tags.Format<"uuid">;
// }): Promise<IErpHrmTimesheet> {
//   const record = await MyGlobal.prisma.erp_hrm_timesheets.findFirstOrThrow({
//     ...ErpHrmTimesheetTransformer.select(),
//     where: { ... },
//   });
//   return await ErpHrmTimesheetTransformer.transform(record);
// }
// ```
//--------------------------------------------------------------