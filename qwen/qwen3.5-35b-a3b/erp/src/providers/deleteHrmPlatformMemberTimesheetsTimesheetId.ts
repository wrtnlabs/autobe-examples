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

export async function deleteHrmPlatformMemberTimesheetsTimesheetId(props: {
  member: MemberPayload;
  timesheetId: string & tags.Format<"uuid">;
}): Promise<void> {
  const timesheet =
    await MyGlobal.prisma.hrm_platform_timesheets.findUniqueOrThrow({
      where: { id: props.timesheetId },
    });
  if (timesheet.deleted_at !== null) {
    throw new HttpException("Timesheet already deleted", 403);
  }
  const employee =
    await MyGlobal.prisma.hrm_platform_employees.findFirstOrThrow({
      where: {
        id: timesheet.hrm_platform_employee_id,
        deleted_at: null,
      },
    });
  const isOwner = employee.hrm_platform_member_id === props.member.id;
  const role = await MyGlobal.prisma.hrm_platform_roles.findFirstOrThrow({
    where: {
      id: employee.hrm_platform_role_id,
      deleted_at: null,
    },
  });
  const permission = await MyGlobal.prisma.hrm_platform_permissions.findFirst({
    where: {
      role_id: role.id,
      organization_id: role.organization_id,
      code: "time:manage",
      deleted_at: null,
    },
  });
  const hasTimeManagePermission = permission !== null;
  if (!isOwner && !hasTimeManagePermission) {
    throw new HttpException("Forbidden", 403);
  }
  if (isOwner && timesheet.status === "approved") {
    throw new HttpException("Cannot delete approved timesheet", 403);
  }
  const deletedAt: string & tags.Format<"date-time"> = new Date().toISOString();
  await MyGlobal.prisma.hrm_platform_timesheets.update({
    where: { id: props.timesheetId },
    data: { deleted_at: deletedAt },
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
// export async function deleteHrmPlatformMemberTimesheetsTimesheetId(props: {
//   member: MemberPayload;
//   timesheetId: string & tags.Format<"uuid">;
// }): Promise<void> {
//   await MyGlobal.prisma.....delete({
//     where: { ... },
//   });
// }
// ```
//--------------------------------------------------------------