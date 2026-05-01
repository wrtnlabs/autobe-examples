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

export async function deleteErpHrmMemberTimesheetsTimesheetIdTimelogsTimelogId(props: {
  member: MemberPayload;
  timesheetId: string & tags.Format<"uuid">;
  timelogId: string & tags.Format<"uuid">;
}): Promise<void> {
  // Step 1: Look up the timesheet with its employee for organization context
  const timesheet = await MyGlobal.prisma.erp_hrm_timesheets.findUniqueOrThrow({
    where: { id: props.timesheetId },
    select: {
      id: true,
      status: true,
      employee: {
        select: {
          id: true,
          erp_hrm_member_id: true,
          erp_hrm_organization_id: true,
        },
      },
    },
  });
  const organizationId = timesheet.employee.erp_hrm_organization_id;
  // Step 2: Look up the timelog and verify it belongs to this timesheet
  const timelog = await MyGlobal.prisma.erp_hrm_timelogs.findUniqueOrThrow({
    where: { id: props.timelogId },
    select: {
      id: true,
      employee_id: true,
      timesheet_id: true,
      deleted_at: true,
    },
  });
  if (timelog.timesheet_id !== props.timesheetId) {
    throw new HttpException(
      "Timelog is not associated with the specified timesheet",
      404,
    );
  }
  // Step 3: Check if already soft-deleted
  if (timelog.deleted_at !== null) {
    throw new HttpException("Timelog not found", 404);
  }
  // Step 4: Find the requesting member's employee record in the same organization
  const requestingEmployee = await MyGlobal.prisma.erp_hrm_employees.findFirst({
    where: {
      erp_hrm_member_id: props.member.id,
      erp_hrm_organization_id: organizationId,
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
  if (requestingEmployee === null) {
    throw new HttpException("Forbidden", 403);
  }
  // Step 5: Determine time:manage permission
  const role = requestingEmployee.role;
  const hasTimeManage: boolean = role.is_builtin
    ? role.name === "Owner" || role.name === "Manager"
    : role.rolePermissions.some((rp) => rp.permission.key === "time:manage");
  const isOwner = timelog.employee_id === requestingEmployee.id;
  // Step 6: Apply timesheet status rules
  const status = timesheet.status;
  if (status === "approved") {
    throw new HttpException(
      "This timelog is locked by an approved timesheet and cannot be deleted.",
      409,
    );
  }
  if (status === "submitted") {
    if (isOwner && !hasTimeManage) {
      throw new HttpException(
        "You cannot delete a timelog that is part of a submitted timesheet.",
        403,
      );
    }
    if (!hasTimeManage) {
      throw new HttpException("Forbidden", 403);
    }
  } else if (status === "draft" || status === "rejected") {
    if (!isOwner && !hasTimeManage) {
      throw new HttpException("Forbidden", 403);
    }
  } else {
    throw new HttpException("Unrecognized timesheet status", 400);
  }
  // Step 7: Perform soft delete and activity logging in a transaction
  const now = new Date();
  await MyGlobal.prisma.$transaction(async (tx) => {
    await tx.erp_hrm_timelogs.update({
      where: { id: props.timelogId },
      data: {
        deleted_at: now,
        timesheet_id: null,
        updated_at: now,
      },
    });
    await tx.erp_hrm_activity_logs.create({
      data: {
        id: v4(),
        user_id: props.member.id,
        organization_id: organizationId,
        action_type: "timelog.deleted",
        target_entity: "timelog",
        target_id: props.timelogId,
        details: null,
        created_at: now,
      },
    });
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
// export async function deleteErpHrmMemberTimesheetsTimesheetIdTimelogsTimelogId(props: {
//   member: MemberPayload;
//   timesheetId: string & tags.Format<"uuid">;
//   timelogId: string & tags.Format<"uuid">;
// }): Promise<void> {
//   await MyGlobal.prisma.....delete({
//     where: { ... },
//   });
// }
// ```
//--------------------------------------------------------------