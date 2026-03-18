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

export async function postHrmPlatformMemberTimesheetsTimesheetIdReject(props: {
  member: MemberPayload;
  timesheetId: string & tags.Format<"uuid">;
  body: IHrmPlatformTimesheet.IReject;
}): Promise<IHrmPlatformTimesheet> {
  // 1. Fetch timesheet with employee and organization relations
  const timesheet = await MyGlobal.prisma.hrm_platform_timesheets.findUnique({
    where: { id: props.timesheetId },
    include: {
      employee: {
        select: {
          hrm_platform_organization_id: true,
        },
      },
    },
  });
  if (timesheet === null) {
    throw new HttpException("Timesheet not found", 404);
  }
  // 2. Validate timesheet status is 'submitted'
  if (timesheet.status !== "submitted") {
    throw new HttpException(
      `Timesheet cannot be rejected in '${timesheet.status}' status`,
      409,
    );
  }
  // 3. Verify member has time:approve permission for the organization
  const memberEmployee = await MyGlobal.prisma.hrm_platform_employees.findFirst(
    {
      where: {
        hrm_platform_organization_id:
          timesheet.employee.hrm_platform_organization_id,
        hrm_platform_user_id: props.member.id,
      },
      include: {
        role: {
          include: {
            permissions: {
              include: {
                permission: true,
              },
            },
          },
        },
      },
    },
  );
  if (!memberEmployee || !memberEmployee.role) {
    throw new HttpException("Forbidden", 403);
  }
  const hasApprovePermission = memberEmployee.role.permissions.some(
    (rp) => rp.permission.code === "time:approve",
  );
  if (!hasApprovePermission) {
    throw new HttpException("Forbidden", 403);
  }
  // 4. Validate rejection_reason is provided and non-empty
  if (
    props.body.rejection_reason === null ||
    props.body.rejection_reason === undefined
  ) {
    throw new HttpException("Rejection reason is required", 400);
  }
  if (props.body.rejection_reason.trim().length === 0) {
    throw new HttpException("Rejection reason cannot be empty", 400);
  }
  // 5. Update timesheet
  await MyGlobal.prisma.hrm_platform_timesheets.update({
    where: { id: props.timesheetId },
    data: {
      status: "rejected",
      hrm_platform_member_id: props.member.id,
      reviewed_at: new Date(),
      rejection_reason: props.body.rejection_reason,
      updated_at: new Date(),
    },
  });
  // 6. Create activity log
  const activityId = v4();
  await MyGlobal.prisma.hrm_platform_activity_logs.create({
    data: {
      id: activityId,
      organization_id: timesheet.employee.hrm_platform_organization_id,
      user_id: props.member.id,
      action_type: "timesheet:rejected",
      target_entity: "timesheet",
      target_id: props.timesheetId,
      details: JSON.stringify({
        rejection_reason: props.body.rejection_reason,
        reviewed_at: new Date().toISOString(),
      }),
      created_at: new Date(),
    },
  });
  // 7. Fetch updated timesheet with all relations
  const updated =
    await MyGlobal.prisma.hrm_platform_timesheets.findUniqueOrThrow({
      where: { id: props.timesheetId },
      ...HrmPlatformTimesheetTransformer.select(),
    });
  // 8. Transform and return
  return await HrmPlatformTimesheetTransformer.transform(updated);
}
