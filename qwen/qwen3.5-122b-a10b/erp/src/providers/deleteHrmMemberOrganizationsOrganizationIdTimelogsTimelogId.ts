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

export async function deleteHrmMemberOrganizationsOrganizationIdTimelogsTimelogId(props: {
  member: MemberPayload;
  organizationId: string & tags.Format<"uuid">;
  timelogId: string & tags.Format<"uuid">;
}): Promise<void> {
  const timelog = await MyGlobal.prisma.hrm_timelogs.findUnique({
    where: { id: props.timelogId },
    select: {
      id: true,
      hrm_employee_id: true,
      hrm_project_id: true,
      deleted_at: true,
      project: {
        select: {
          hrm_organization_id: true,
        },
      },
      employee: {
        select: {
          user_id: true,
        },
      },
    },
  });
  if (timelog === null) {
    throw new HttpException("Timelog not found", 404);
  }
  if (timelog.deleted_at !== null) {
    throw new HttpException("Timelog not found", 404);
  }
  if (timelog.project.hrm_organization_id !== props.organizationId) {
    throw new HttpException(
      "Timelog does not belong to the specified organization",
      403,
    );
  }
  const employee = await MyGlobal.prisma.hrm_employees.findFirst({
    where: {
      organization_id: props.organizationId,
      user_id: props.member.id,
      deleted_at: null,
    },
    select: {
      id: true,
    },
  });
  if (employee === null) {
    throw new HttpException(
      "Employee record not found for this organization",
      403,
    );
  }
  if (timelog.hrm_employee_id !== employee.id) {
    throw new HttpException("Forbidden", 403);
  }
  const timesheetAssociations =
    await MyGlobal.prisma.hrm_timesheet_timelogs.findMany({
      where: {
        timelog_id: props.timelogId,
        deleted_at: null,
      },
      select: {
        timesheet: {
          select: {
            status: true,
          },
        },
      },
    });
  const lockedTimesheet = timesheetAssociations.find(
    (association) =>
      association.timesheet.status === "submitted" ||
      association.timesheet.status === "approved",
  );
  if (lockedTimesheet !== undefined) {
    throw new HttpException(
      "Cannot delete timelog that is part of a submitted or approved timesheet",
      403,
    );
  }
  await MyGlobal.prisma.hrm_timelogs.update({
    where: { id: props.timelogId },
    data: {
      deleted_at: new Date(),
      updated_at: new Date(),
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
// export async function deleteHrmMemberOrganizationsOrganizationIdTimelogsTimelogId(props: {
//   member: MemberPayload;
//   organizationId: string & tags.Format<"uuid">;
//   timelogId: string & tags.Format<"uuid">;
// }): Promise<void> {
//   await MyGlobal.prisma.....delete({
//     where: { ... },
//   });
// }
// ```
//--------------------------------------------------------------