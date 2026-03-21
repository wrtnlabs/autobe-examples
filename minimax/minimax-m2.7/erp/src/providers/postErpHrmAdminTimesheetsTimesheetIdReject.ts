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
import { AdminPayload } from "../decorators/payload/AdminPayload";
import { ErpHrmTimesheetTransformer } from "../transformers/ErpHrmTimesheetTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function postErpHrmAdminTimesheetsTimesheetIdReject(props: {
  admin: AdminPayload;
  timesheetId: string & tags.Format<"uuid">;
  body: IErpHrmTimesheet.IReject;
}): Promise<IErpHrmTimesheet> {
  // 1. Find the timesheet
  const timesheet = await MyGlobal.prisma.erp_hrm_timesheets.findUniqueOrThrow({
    where: { id: props.timesheetId },
    select: { id: true, status: true },
  });
  // 2. Validate timesheet is in submitted status
  if (timesheet.status !== "submitted") {
    throw new HttpException(
      "Timesheet cannot be rejected because it is not in submitted status",
      400,
    );
  }
  // 3. Get the timesheet's organization to find a reviewer employee
  const timesheetWithOrg =
    await MyGlobal.prisma.erp_hrm_timesheets.findUniqueOrThrow({
      where: { id: props.timesheetId },
      select: {
        id: true,
        erp_hrm_employee_id: true,
        employee: {
          select: { erp_hrm_organization_id: true },
        },
      },
    });
  // 4. Find a reviewer employee in the same organization
  // The reviewer should be an active employee with appropriate permissions
  const reviewerEmployee = await MyGlobal.prisma.erp_hrm_employees.findFirst({
    where: {
      erp_hrm_organization_id:
        timesheetWithOrg.employee.erp_hrm_organization_id,
      status: "active",
      deleted_at: null,
    },
    select: { id: true },
  });
  if (!reviewerEmployee) {
    throw new HttpException("No reviewer employee found in organization", 403);
  }
  // 5. Update timesheet status to rejected using transaction
  await MyGlobal.prisma.$transaction([
    MyGlobal.prisma.erp_hrm_timesheets.update({
      where: { id: props.timesheetId },
      data: {
        status: "rejected",
        rejection_reason: props.body.rejectionReason,
        reviewed_at: new Date(),
        erp_hrm_reviewer_employee_id: reviewerEmployee.id,
        updated_at: new Date(),
      },
    }),
    MyGlobal.prisma.erp_hrm_timesheet_timelogs.deleteMany({
      where: { erp_hrm_timesheet_id: props.timesheetId },
    }),
  ]);
  // 6. Fetch updated timesheet with all relations for response
  const updatedTimesheet =
    await MyGlobal.prisma.erp_hrm_timesheets.findUniqueOrThrow({
      where: { id: props.timesheetId },
      ...ErpHrmTimesheetTransformer.select(),
    });
  // 7. Transform and return
  return ErpHrmTimesheetTransformer.transform(updatedTimesheet);
}
