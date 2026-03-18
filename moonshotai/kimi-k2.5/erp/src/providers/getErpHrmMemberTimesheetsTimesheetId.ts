import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IErpHrmDepartment } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmDepartment";
import { IErpHrmMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmMember";
import { IErpHrmOrganizationMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmOrganizationMember";
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
  timesheetId: string;
}): Promise<IErpHrmTimesheet> {
  // Fetch timesheet with all nested relations using transformer select
  const timesheet = await MyGlobal.prisma.erp_hrm_timesheets.findUniqueOrThrow({
    where: { id: props.timesheetId },
    ...ErpHrmTimesheetTransformer.select(),
  });
  // Check authorization - must own the timesheet or have TIMESHEET_VIEW_ALL permission
  const isOwner = timesheet.organizationMember.id === props.member.id;
  if (!isOwner) {
    // Check if member has TIMESHEET_VIEW_ALL permission
    const hasViewAllPermission =
      await MyGlobal.prisma.erp_hrm_role_permissions.findFirst({
        where: {
          role: {
            organizationMembers: {
              some: {
                id: props.member.id,
              },
            },
          },
          permission: "TIMESHEET_VIEW_ALL",
          deleted_at: null,
        },
      });
    if (!hasViewAllPermission) {
      throw new HttpException("Forbidden", 403);
    }
  }
  // Transform and return the timesheet
  return await ErpHrmTimesheetTransformer.transform(timesheet);
}
