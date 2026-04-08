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

export async function deleteErpHrmMemberTimelogsTimelogId(props: {
  member: MemberPayload;
  timelogId: string & tags.Format<"uuid">;
}): Promise<void> {
  // 1. Find the timelog
  const timelog = await MyGlobal.prisma.erp_hrm_timelogs.findUniqueOrThrow({
    where: { id: props.timelogId },
    select: {
      id: true,
      erp_hrm_employee_id: true,
    },
  });
  // 2. Get the employee's record linked to this timelog
  const timelogEmployee = await MyGlobal.prisma.erp_hrm_employees.findUnique({
    where: { id: timelog.erp_hrm_employee_id },
    select: {
      id: true,
      erp_hrm_member_id: true,
      erp_hrm_organization_id: true,
      erp_hrm_role_id: true,
    },
  });
  if (timelogEmployee === null) {
    throw new HttpException("Timelog not found", 404);
  }
  // 3. Check if the member is the owner of this timelog
  const isOwner = timelogEmployee.erp_hrm_member_id === props.member.id;
  // 4. Get the member's own employee record to check permission
  const memberEmployee = await MyGlobal.prisma.erp_hrm_employees.findFirst({
    where: {
      erp_hrm_member_id: props.member.id,
      deleted_at: null,
    },
    select: {
      id: true,
      erp_hrm_organization_id: true,
      erp_hrm_role_id: true,
    },
  });
  // 5. Check if member has time:manage permission
  const hasTimeManagePermission =
    memberEmployee !== null &&
    (await MyGlobal.prisma.erp_hrm_role_permissions.findFirst({
      where: {
        erp_hrm_role_id: memberEmployee.erp_hrm_role_id,
        permission: "time:manage",
      },
    })) !== null;
  // 6. If not owner and no time:manage permission, throw forbidden
  if (!isOwner && !hasTimeManagePermission) {
    throw new HttpException("Forbidden", 403);
  }
  // 7. If owner (without time:manage), check that timelog is not in submitted/approved timesheet
  if (isOwner && !hasTimeManagePermission) {
    const restrictedTimesheet =
      await MyGlobal.prisma.erp_hrm_timesheet_timelogs.findFirst({
        where: {
          erp_hrm_timelog_id: props.timelogId,
        },
        select: {
          timesheet: {
            select: {
              id: true,
              status: true,
            },
          },
        },
      });
    if (
      restrictedTimesheet !== null &&
      (restrictedTimesheet.timesheet.status === "submitted" ||
        restrictedTimesheet.timesheet.status === "approved")
    ) {
      throw new HttpException(
        "Cannot delete timelog that is part of a submitted or approved timesheet",
        400,
      );
    }
  }
  // 8. If time:manage, log the activity before deletion
  if (hasTimeManagePermission && memberEmployee !== null) {
    await MyGlobal.prisma.erp_hrm_activity_logs.create({
      data: {
        id: v4(),
        erp_hrm_organization_id: memberEmployee.erp_hrm_organization_id,
        erp_hrm_member_id: props.member.id,
        action_type: "timelog_deleted",
        target_entity_type: "timelog",
        target_entity_id: props.timelogId,
        details: JSON.stringify({
          deletedTimelogId: props.timelogId,
          employeeId: timelog.erp_hrm_employee_id,
        }),
        created_at: new Date(),
      },
    });
  }
  // 9. Delete the timelog (cascade handles erp_hrm_timesheet_timelogs junction records)
  await MyGlobal.prisma.erp_hrm_timelogs.delete({
    where: { id: props.timelogId },
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
// export async function deleteErpHrmMemberTimelogsTimelogId(props: {
//   member: MemberPayload;
//   timelogId: string & tags.Format<"uuid">;
// }): Promise<void> {
//   await MyGlobal.prisma.....delete({
//     where: { ... },
//   });
// }
// ```
//--------------------------------------------------------------