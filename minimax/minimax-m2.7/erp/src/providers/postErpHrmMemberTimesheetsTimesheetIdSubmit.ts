import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IErpHrmDepartment } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmDepartment";
import { IErpHrmEmployee } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmEmployee";
import { IErpHrmMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmMember";
import { IErpHrmOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmOrganization";
import { IErpHrmProjectMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmProjectMember";
import { IErpHrmRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmRole";
import { IErpHrmTask } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTask";
import { IErpHrmTimelog } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimelog";
import { IErpHrmTimesheet } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimesheet";
import { IErpHrmTimesheetTimelog } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimesheetTimelog";
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

export async function postErpHrmMemberTimesheetsTimesheetIdSubmit(props: {
  member: MemberPayload;
  timesheetId: string & tags.Format<"uuid">;
}): Promise<IErpHrmTimesheet> {
  return await MyGlobal.prisma.$transaction(async (tx) => {
    // Step 1-3: Retrieve timesheet and validate existence + not deleted
    const timesheet = await tx.erp_hrm_timesheets.findFirst({
      where: {
        id: props.timesheetId,
        deleted_at: null,
      },
      select: {
        id: true,
        erp_hrm_employee_id: true,
        week_start_date: true,
        status: true,
        employee: {
          select: {
            id: true,
            erp_hrm_member_id: true,
          },
        },
      },
    });
    if (!timesheet) {
      throw new HttpException("Timesheet not found or deleted", 404);
    }
    // Step 4: Validate timesheet belongs to authenticated employee
    const employee = await tx.erp_hrm_employees.findFirst({
      where: {
        erp_hrm_member_id: props.member.id,
        deleted_at: null,
      },
      select: {
        id: true,
      },
    });
    if (!employee || timesheet.erp_hrm_employee_id !== employee.id) {
      throw new HttpException(
        "Timesheet does not belong to authenticated employee",
        403,
      );
    }
    // Step 5: Validate timesheet status is 'draft'
    if (timesheet.status !== "draft") {
      throw new HttpException(
        "Timesheet is not in draft status and cannot be submitted",
        409,
      );
    }
    // Step 6-7: Count associated timelogs, reject if zero
    const timelogCount = await tx.erp_hrm_timesheet_timelogs.count({
      where: {
        erp_hrm_timesheet_id: props.timesheetId,
      },
    });
    if (timelogCount === 0) {
      throw new HttpException(
        "Timesheet must contain at least one timelog before submission",
        422,
      );
    }
    // Step 8-9: Check for duplicate submission (same employee + week)
    const existingSubmission = await tx.erp_hrm_timesheets.findFirst({
      where: {
        erp_hrm_employee_id: timesheet.erp_hrm_employee_id,
        week_start_date: timesheet.week_start_date,
        status: {
          in: ["submitted", "approved"],
        },
        id: {
          not: props.timesheetId,
        },
      },
    });
    if (existingSubmission) {
      throw new HttpException(
        "A timesheet for this week has already been submitted or approved",
        409,
      );
    }
    // Step 10: Update timesheet to submitted status
    await tx.erp_hrm_timesheets.update({
      where: { id: props.timesheetId },
      data: {
        status: "submitted",
        submitted_at: new Date(),
        updated_at: new Date(),
      },
    });
    // Step 11: Return updated timesheet with all related data
    const updated = await tx.erp_hrm_timesheets.findUniqueOrThrow({
      where: { id: props.timesheetId },
      ...ErpHrmTimesheetTransformer.select(),
    });
    return await ErpHrmTimesheetTransformer.transform(updated);
  });
}
