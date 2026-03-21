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

export async function postErpHrmMemberTimesheetsTimesheetIdApprove(props: {
  member: MemberPayload;
  timesheetId: string & tags.Format<"uuid">;
}): Promise<IErpHrmTimesheet> {
  // Step 1: Retrieve the target timesheet with employee relation
  const timesheet = await MyGlobal.prisma.erp_hrm_timesheets.findFirst({
    where: {
      id: props.timesheetId,
      deleted_at: null,
    },
    select: {
      id: true,
      erp_hrm_employee_id: true,
      status: true,
      employee: {
        select: {
          id: true,
          erp_hrm_organization_id: true,
          erp_hrm_role_id: true,
        },
      },
    },
  });
  if (timesheet === null) {
    throw new HttpException("Timesheet not found", 404);
  }
  // Step 2: Validate timesheet status is 'submitted'
  if (timesheet.status !== "submitted") {
    throw new HttpException(
      "Timesheet must be in submitted status to be approved",
      400,
    );
  }
  // Step 3: Get the approving employee's record
  const approverEmployee = await MyGlobal.prisma.erp_hrm_employees.findFirst({
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
  if (approverEmployee === null) {
    throw new HttpException("Employee record not found", 404);
  }
  // Step 4: Verify timesheet belongs to the same organization
  if (
    timesheet.employee.erp_hrm_organization_id !==
    approverEmployee.erp_hrm_organization_id
  ) {
    throw new HttpException("Forbidden", 403);
  }
  // Step 5: Check time:approve permission
  const hasTimeApprovePermission =
    await MyGlobal.prisma.erp_hrm_role_permissions.findFirst({
      where: {
        erp_hrm_role_id: approverEmployee.erp_hrm_role_id,
        permission: "time:approve",
      },
    });
  if (hasTimeApprovePermission === null) {
    throw new HttpException("Forbidden", 403);
  }
  // Step 6: Update the timesheet to approved status
  const updatedTimesheet = await MyGlobal.prisma.erp_hrm_timesheets.update({
    where: {
      id: props.timesheetId,
    },
    data: {
      status: "approved",
      erp_hrm_reviewer_employee_id: approverEmployee.id,
      reviewed_at: new Date(),
    },
    ...ErpHrmTimesheetTransformer.select(),
  });
  // Step 7: Return the updated timesheet
  return await ErpHrmTimesheetTransformer.transform(updatedTimesheet);
}
