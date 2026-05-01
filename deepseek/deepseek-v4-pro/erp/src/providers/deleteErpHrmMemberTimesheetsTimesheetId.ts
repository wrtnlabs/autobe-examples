import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { MemberPayload } from "../decorators/payload/MemberPayload";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function deleteErpHrmMemberTimesheetsTimesheetId(props: {
  member: MemberPayload;
  timesheetId: string & tags.Format<"uuid">;
}): Promise<void> {
  const session =
    await MyGlobal.prisma.erp_hrm_member_sessions.findUniqueOrThrow({
      where: { id: props.member.session_id },
      select: { erp_hrm_organization_id: true },
    });
  if (session.erp_hrm_organization_id === null) {
    throw new HttpException("No organization context selected", 400);
  }
  const requestingEmployee =
    await MyGlobal.prisma.erp_hrm_employees.findFirstOrThrow({
      where: {
        erp_hrm_member_id: props.member.id,
        erp_hrm_organization_id: session.erp_hrm_organization_id,
        deleted_at: null,
        status: "active",
      },
      select: { id: true, erp_hrm_role_id: true },
    });
  const timesheet = await MyGlobal.prisma.erp_hrm_timesheets.findUniqueOrThrow({
    where: { id: props.timesheetId },
    select: {
      id: true,
      employee_id: true,
      status: true,
      deleted_at: true,
      employee: {
        select: {
          id: true,
          erp_hrm_organization_id: true,
        },
      },
    },
  });
  if (
    timesheet.employee.erp_hrm_organization_id !==
    session.erp_hrm_organization_id
  ) {
    throw new HttpException("Timesheet not found", 404);
  }
  if (timesheet.deleted_at !== null) {
    throw new HttpException("Timesheet not found", 404);
  }
  const isOwner = timesheet.employee_id === requestingEmployee.id;
  let hasTimeManage = false;
  if (!isOwner) {
    const role = await MyGlobal.prisma.erp_hrm_roles.findUniqueOrThrow({
      where: { id: requestingEmployee.erp_hrm_role_id },
      select: { name: true, is_builtin: true, id: true },
    });
    if (role.is_builtin) {
      hasTimeManage = role.name === "Owner" || role.name === "Manager";
    } else {
      const permission =
        await MyGlobal.prisma.erp_hrm_role_permissions.findFirst({
          where: {
            erp_hrm_role_id: role.id,
            permission: { key: "time:manage" },
          },
          select: { id: true },
        });
      hasTimeManage = permission !== null;
    }
  }
  if (!isOwner && !hasTimeManage) {
    throw new HttpException("Forbidden", 403);
  }
  if (timesheet.status === "submitted") {
    throw new HttpException(
      "Cannot delete a submitted timesheet. It must be approved or rejected first.",
      409,
    );
  }
  if (timesheet.status === "approved") {
    throw new HttpException("Cannot delete an approved timesheet.", 409);
  }
  await MyGlobal.prisma.erp_hrm_timelogs.updateMany({
    where: { timesheet_id: props.timesheetId },
    data: { timesheet_id: null },
  });
  await MyGlobal.prisma.erp_hrm_timesheets.update({
    where: { id: props.timesheetId },
    data: { deleted_at: new Date().toISOString() },
  });
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
// 
// // DON'T CHANGE FUNCTION NAME AND PARAMETERS,
// // ONLY YOU HAVE TO WRITE THIS FUNCTION BODY, AND USE IMPORTED.
// export async function deleteErpHrmMemberTimesheetsTimesheetId(props: {
//   member: MemberPayload;
//   timesheetId: string & tags.Format<"uuid">;
// }): Promise<void> {
//   await MyGlobal.prisma.....delete({
//     where: { ... },
//   });
// }
// ```
//--------------------------------------------------------------