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

export async function deleteHrmMemberOrganizationsOrganizationIdTimesheetsTimesheetId(props: {
  member: MemberPayload;
  organizationId: string & tags.Format<"uuid">;
  timesheetId: string & tags.Format<"uuid">;
}): Promise<void> {
  const timesheet = await MyGlobal.prisma.hrm_timesheets.findFirst({
    where: {
      id: props.timesheetId,
      deleted_at: null,
      employee: {
        organization_id: props.organizationId,
        deleted_at: null,
      },
    },
    select: {
      id: true,
      status: true,
      employee: {
        select: {
          user_id: true,
        },
      },
    },
  });
  if (!timesheet) {
    throw new HttpException("Timesheet not found", 404);
  }
  if (timesheet.employee.user_id !== props.member.id) {
    throw new HttpException("Forbidden", 403);
  }
  if (timesheet.status !== "draft") {
    throw new HttpException(
      "Cannot delete timesheet - only draft status is allowed",
      400,
    );
  }
  await MyGlobal.prisma.hrm_timesheets.update({
    where: { id: props.timesheetId },
    data: {
      deleted_at: new Date(),
    },
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
// export async function deleteHrmMemberOrganizationsOrganizationIdTimesheetsTimesheetId(props: {
//   member: MemberPayload;
//   organizationId: string & tags.Format<"uuid">;
//   timesheetId: string & tags.Format<"uuid">;
// }): Promise<void> {
//   await MyGlobal.prisma.....delete({
//     where: { ... },
//   });
// }
// ```
//--------------------------------------------------------------