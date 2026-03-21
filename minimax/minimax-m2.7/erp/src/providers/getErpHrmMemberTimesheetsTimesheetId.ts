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

export async function getErpHrmMemberTimesheetsTimesheetId(props: {
  member: MemberPayload;
  timesheetId: string & tags.Format<"uuid">;
}): Promise<IErpHrmTimesheet> {
  // Get the requesting employee's record to check permissions and ownership
  const requestingEmployee =
    await MyGlobal.prisma.erp_hrm_employees.findFirstOrThrow({
      where: {
        erp_hrm_member_id: props.member.id,
        deleted_at: null,
      },
      select: {
        id: true,
        erp_hrm_role_id: true,
      },
    });
  // Check if user has time:view_all permission
  const hasViewAllPermission =
    await MyGlobal.prisma.erp_hrm_role_permissions.findFirst({
      where: {
        erp_hrm_role_id: requestingEmployee.erp_hrm_role_id,
        permission: "time:view_all",
      },
      select: { id: true },
    });
  // Query the timesheet using transformer select
  const timesheet = await MyGlobal.prisma.erp_hrm_timesheets.findUniqueOrThrow({
    where: {
      id: props.timesheetId,
      deleted_at: null,
    },
    ...ErpHrmTimesheetTransformer.select(),
  });
  // Authorization check: either has time:view_all permission OR owns the timesheet
  if (
    !hasViewAllPermission &&
    timesheet.employee.id !== requestingEmployee.id
  ) {
    throw new HttpException("Forbidden", 403);
  }
  // Transform and return using transformer
  return ErpHrmTimesheetTransformer.transform(timesheet);
}
