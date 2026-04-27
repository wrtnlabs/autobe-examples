import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IHrmTimeTrackingDepartment } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingDepartment";
import { IHrmTimeTrackingEmployee } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingEmployee";
import { IHrmTimeTrackingMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingMember";
import { IHrmTimeTrackingOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingOrganization";
import { IHrmTimeTrackingProject } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingProject";
import { IHrmTimeTrackingRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingRole";
import { IHrmTimeTrackingTask } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingTask";
import { IHrmTimeTrackingTimelog } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingTimelog";
import { IHrmTimeTrackingTimesheet } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingTimesheet";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { MemberPayload } from "../decorators/payload/MemberPayload";
import { HrmTimeTrackingTimesheetTransformer } from "../transformers/HrmTimeTrackingTimesheetTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function postHrmTimeTrackingMemberTimesheetsTimesheetIdReject(props: {
  member: MemberPayload;
  timesheetId: string & tags.Format<"uuid">;
  body: IHrmTimeTrackingTimesheet.IReject;
}): Promise<IHrmTimeTrackingTimesheet> {
  const rejectionReason = props.body.rejection_reason?.trim();
  if (!rejectionReason || rejectionReason.length === 0) {
    throw new HttpException(
      "Rejection reason is required and must be non-empty",
      400,
    );
  }
  await MyGlobal.prisma.$transaction(async (tx) => {
    const timesheet = await tx.hrm_time_tracking_timesheets.findFirstOrThrow({
      where: {
        id: props.timesheetId,
        deleted_at: null,
      },
      select: {
        id: true,
        status: true,
        hrm_time_tracking_employee_id: true,
        employee: {
          select: {
            hrm_time_tracking_organization_id: true,
          },
        },
      },
    });
    if (timesheet.status !== "submitted") {
      if (timesheet.status === "approved") {
        throw new HttpException(
          "Cannot reject an already approved timesheet",
          400,
        );
      }
      if (timesheet.status === "rejected") {
        throw new HttpException("Timesheet has already been rejected", 400);
      }
      if (timesheet.status === "draft") {
        throw new HttpException(
          "Cannot reject a draft timesheet - it must be submitted first",
          400,
        );
      }
      throw new HttpException("Timesheet is not in a rejectable state", 400);
    }
    const reviewerEmployee =
      await tx.hrm_time_tracking_employees.findFirstOrThrow({
        where: {
          hrm_time_tracking_member_id: props.member.id,
          hrm_time_tracking_organization_id:
            timesheet.employee.hrm_time_tracking_organization_id,
          deleted_at: null,
        },
        select: {
          id: true,
          hrm_time_tracking_role_id: true,
        },
      });
    const permission = await tx.hrm_time_tracking_role_permissions.findFirst({
      where: {
        hrm_time_tracking_role_id: reviewerEmployee.hrm_time_tracking_role_id,
        permission_code: "time:approve",
        deleted_at: null,
      },
    });
    if (permission === null) {
      throw new HttpException(
        "You don't have permission to reject timesheets",
        403,
      );
    }
    if (reviewerEmployee.id === timesheet.hrm_time_tracking_employee_id) {
      throw new HttpException("You cannot reject your own timesheet", 403);
    }
    await tx.hrm_time_tracking_timesheets.update({
      where: { id: props.timesheetId },
      data: {
        status: "draft",
        hrm_time_tracking_reviewer_id: props.member.id,
        reviewed_at: new Date().toISOString(),
        rejection_reason: rejectionReason,
        updated_at: new Date().toISOString(),
      },
    });
  });
  const updatedTimesheet =
    await MyGlobal.prisma.hrm_time_tracking_timesheets.findFirstOrThrow({
      where: {
        id: props.timesheetId,
        deleted_at: null,
      },
      ...HrmTimeTrackingTimesheetTransformer.select(),
    });
  return await HrmTimeTrackingTimesheetTransformer.transform(updatedTimesheet);
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
// import { IHrmTimeTrackingTimesheet } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingTimesheet";
// import { IHrmTimeTrackingEmployee } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingEmployee";
// import { IHrmTimeTrackingMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingMember";
// import { IHrmTimeTrackingRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingRole";
// import { IHrmTimeTrackingOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingOrganization";
// import { IHrmTimeTrackingDepartment } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingDepartment";
// import { IHrmTimeTrackingTimelog } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingTimelog";
// import { IHrmTimeTrackingProject } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingProject";
// import { IHrmTimeTrackingTask } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingTask";
// 
// // DON'T CHANGE FUNCTION NAME AND PARAMETERS,
// // ONLY YOU HAVE TO WRITE THIS FUNCTION BODY, AND USE IMPORTED.
// export async function postHrmTimeTrackingMemberTimesheetsTimesheetIdReject(props: {
//   member: MemberPayload;
//   timesheetId: string & tags.Format<"uuid">;
//   body: IHrmTimeTrackingTimesheet.IReject;
// }): Promise<IHrmTimeTrackingTimesheet> {
//   const record = await MyGlobal.prisma.hrm_time_tracking_timesheets.findFirstOrThrow({
//     ...HrmTimeTrackingTimesheetTransformer.select(),
//     where: { ... },
//   });
//   return await HrmTimeTrackingTimesheetTransformer.transform(record);
// }
// ```
//--------------------------------------------------------------