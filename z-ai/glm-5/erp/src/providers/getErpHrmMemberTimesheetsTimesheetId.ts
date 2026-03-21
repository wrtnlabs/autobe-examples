import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IErpHrmDepartment } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmDepartment";
import { IErpHrmEmployee } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmEmployee";
import { IErpHrmMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmMember";
import { IErpHrmProject } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmProject";
import { IErpHrmRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmRole";
import { IErpHrmTask } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTask";
import { IErpHrmTimelog } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimelog";
import { IErpHrmTimesheet } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimesheet";
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

export async function getErpHrmMemberTimesheetsTimesheetId(props: {
  member: MemberPayload;
  timesheetId: string & tags.Format<"uuid">;
}): Promise<IErpHrmTimesheet> {
  const timesheet = await MyGlobal.prisma.erp_hrm_timesheets.findFirst({
    where: {
      id: props.timesheetId,
      deleted_at: null,
    },
    select: {
      employee_id: true,
      ...ErpHrmTimesheetTransformer.select().select,
    },
  });
  if (!timesheet) {
    throw new HttpException("Timesheet not found", 404);
  }
  // Query employee directly to get organization_id for authorization check
  const timesheetEmployee = await MyGlobal.prisma.erp_hrm_employees.findUnique({
    where: { id: timesheet.employee_id },
    select: { erp_hrm_organization_id: true },
  });
  if (!timesheetEmployee) {
    throw new HttpException("Timesheet employee not found", 404);
  }
  const employee = await MyGlobal.prisma.erp_hrm_employees.findFirst({
    where: {
      erp_hrm_member_id: props.member.id,
      erp_hrm_organization_id: timesheetEmployee.erp_hrm_organization_id,
      deleted_at: null,
    },
    select: {
      id: true,
      erp_hrm_role_id: true,
    },
  });
  if (!employee) {
    throw new HttpException("Forbidden", 403);
  }
  const isOwner = employee.id === timesheet.employee_id;
  if (!isOwner) {
    const permission = await MyGlobal.prisma.erp_hrm_role_permissions.findFirst(
      {
        where: {
          erp_hrm_role_id: employee.erp_hrm_role_id,
          permission: "time:view_all",
        },
      },
    );
    if (!permission) {
      throw new HttpException("Forbidden", 403);
    }
  }
  return ErpHrmTimesheetTransformer.transform(timesheet);
}
