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
  // Fetch timesheet with employee relation for authorization check
  const timesheet = await MyGlobal.prisma.hrm_platform_timesheets.findFirst({
    where: {
      id: props.timesheetId,
      deleted_at: null,
    },
    select: {
      id: true,
      hrm_platform_employee_id: true,
      employee: {
        select: {
          hrm_platform_user_id: true,
          hrm_platform_organization_id: true,
        },
      },
    },
  });
  // 404 if not found
  if (!timesheet) {
    throw new HttpException("Timesheet not found", 404);
  }
  // Authorization check: member owns the timesheet OR has time:approve permission in the organization
  const isOwner = timesheet.employee.hrm_platform_user_id === props.member.id;
  if (!isOwner) {
    // Check if member has time:approve permission in the timesheet's organization
    const memberRole = await MyGlobal.prisma.hrm_platform_employees.findFirst({
      where: {
        hrm_platform_user_id: props.member.id,
        hrm_platform_organization_id:
          timesheet.employee.hrm_platform_organization_id,
        deleted_at: null,
      },
      select: {
        role: {
          select: {
            permissions: {
              select: {
                permission: true,
              },
            },
          },
        },
      },
    });
    const hasTimeApprovePermission = memberRole?.role?.permissions.some(
      (rp) => rp.permission.code === "time:approve",
    );
    if (!hasTimeApprovePermission) {
      throw new HttpException("Forbidden", 403);
    }
  }
  // Fetch full timesheet data using transformer
  const fullTimesheet =
    await MyGlobal.prisma.hrm_platform_timesheets.findUniqueOrThrow({
      where: { id: props.timesheetId },
      ...HrmPlatformTimesheetTransformer.select(),
    });
  return await HrmPlatformTimesheetTransformer.transform(fullTimesheet);
}
