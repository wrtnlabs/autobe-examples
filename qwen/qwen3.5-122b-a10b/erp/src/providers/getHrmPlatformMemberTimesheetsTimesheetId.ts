import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IHrmPlatformDepartment } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformDepartment";
import { IHrmPlatformEmployee } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformEmployee";
import { IHrmPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformMember";
import { IHrmPlatformOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformOrganization";
import { IHrmPlatformProject } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformProject";
import { IHrmPlatformRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformRole";
import { IHrmPlatformTask } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformTask";
import { IHrmPlatformTimelog } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformTimelog";
import { IHrmPlatformTimesheet } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformTimesheet";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { MemberPayload } from "../decorators/payload/MemberPayload";
import { HrmPlatformTimesheetTransformer } from "../transformers/HrmPlatformTimesheetTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function getHrmPlatformMemberTimesheetsTimesheetId(props: {
  member: MemberPayload;
  timesheetId: string & tags.Format<"uuid">;
}): Promise<IHrmPlatformTimesheet> {
  // Fetch timesheet for authorization check
  const timesheet =
    await MyGlobal.prisma.hrm_platform_timesheets.findUniqueOrThrow({
      where: {
        id: props.timesheetId,
        deleted_at: null,
      },
      select: {
        id: true,
        hrm_platform_employee_id: true,
        hrm_platform_member_id: true,
        week_start_date: true,
        week_end_date: true,
        status: true,
        submitted_at: true,
        reviewed_at: true,
        rejection_reason: true,
        created_at: true,
        updated_at: true,
        deleted_at: true,
      },
    });
  // Fetch employee to get organization_id and check ownership
  const employee =
    await MyGlobal.prisma.hrm_platform_employees.findUniqueOrThrow({
      where: {
        id: timesheet.hrm_platform_employee_id,
        deleted_at: null,
      },
      select: {
        id: true,
        hrm_platform_user_id: true,
        hrm_platform_organization_id: true,
      },
    });
  // Check authorization: owner or time:approve permission
  const isOwner = timesheet.hrm_platform_member_id === props.member.id;
  if (!isOwner) {
    // Check if member has time:approve permission in the organization
    const memberEmployee =
      await MyGlobal.prisma.hrm_platform_employees.findFirst({
        where: {
          hrm_platform_user_id: props.member.id,
          hrm_platform_organization_id: employee.hrm_platform_organization_id,
          deleted_at: null,
        },
        select: {
          hrm_platform_role_id: true,
        },
      });
    if (!memberEmployee) {
      throw new HttpException("Forbidden", 403);
    }
    // Check if the role has time:approve permission
    const hasApprovePermission =
      await MyGlobal.prisma.hrm_platform_role_permissions.findFirst({
        where: {
          hrm_platform_role_id: memberEmployee.hrm_platform_role_id,
          permission: {
            code: "time:approve",
          },
        },
      });
    if (!hasApprovePermission) {
      throw new HttpException("Forbidden", 403);
    }
  }
  // Fetch full timesheet with all relations using transformer select
  const fullTimesheet =
    await MyGlobal.prisma.hrm_platform_timesheets.findUniqueOrThrow({
      where: {
        id: props.timesheetId,
        deleted_at: null,
      },
      ...HrmPlatformTimesheetTransformer.select(),
    });
  return await HrmPlatformTimesheetTransformer.transform(fullTimesheet);
}
