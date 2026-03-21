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

export async function postErpHrmAdminTimesheetsTimesheetIdApprove(props: {
  admin: AdminPayload;
  timesheetId: string & tags.Format<"uuid">;
}): Promise<IErpHrmTimesheet> {
  // 1. Find admin's employee record to get organization context for permission verification
  const adminEmployees = await MyGlobal.prisma.erp_hrm_employees.findMany({
    where: {
      erp_hrm_member_id: props.admin.id,
      deleted_at: null,
    },
    select: {
      id: true,
      erp_hrm_organization_id: true,
    },
  });
  if (adminEmployees.length === 0) {
    throw new HttpException("Admin employee record not found", 403);
  }
  // Use first active employee record for the admin
  const adminEmployee = adminEmployees[0];
  // 2. Retrieve timesheet with employee and timelogs using transformer
  const timesheet = await MyGlobal.prisma.erp_hrm_timesheets.findUnique({
    where: { id: props.timesheetId },
    ...ErpHrmTimesheetTransformer.select(),
  });
  // 3. Validate timesheet exists
  if (!timesheet) {
    throw new HttpException("Timesheet not found", 404);
  }
  // 4. Validate timesheet is not soft-deleted
  if (timesheet.deleted_at !== null) {
    throw new HttpException("Timesheet not found", 404);
  }
  // 5. Validate timesheet status is 'submitted' - only submitted timesheets can be approved
  if (timesheet.status !== "submitted") {
    throw new HttpException(
      `Timesheet cannot be approved. Current status: ${timesheet.status}`,
      400,
    );
  }
  // 6. Validate timesheet belongs to same organization as admin
  // Fetch employee's organization_id since transformer may not include it
  const timesheetEmployeeOrg =
    await MyGlobal.prisma.erp_hrm_employees.findUnique({
      where: { id: timesheet.employee.id },
      select: { erp_hrm_organization_id: true },
    });
  if (
    !timesheetEmployeeOrg ||
    timesheetEmployeeOrg.erp_hrm_organization_id !==
      adminEmployee.erp_hrm_organization_id
  ) {
    throw new HttpException("Forbidden", 403);
  }
  // 7. Update timesheet to approved status with reviewer information
  const now = new Date();
  await MyGlobal.prisma.erp_hrm_timesheets.update({
    where: { id: props.timesheetId },
    data: {
      status: "approved",
      erp_hrm_reviewer_employee_id: adminEmployee.id,
      reviewed_at: now,
      updated_at: now,
    },
  });
  // 8. Fetch updated timesheet with all relations for response
  const updatedTimesheet =
    await MyGlobal.prisma.erp_hrm_timesheets.findUniqueOrThrow({
      where: { id: props.timesheetId },
      ...ErpHrmTimesheetTransformer.select(),
    });
  // 9. Return transformed response
  return await ErpHrmTimesheetTransformer.transform(updatedTimesheet);
}
