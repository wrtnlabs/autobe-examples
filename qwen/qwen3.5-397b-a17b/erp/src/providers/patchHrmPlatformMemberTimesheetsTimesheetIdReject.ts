import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IHrmPlatformDepartment } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformDepartment";
import { IHrmPlatformEmployee } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformEmployee";
import { IHrmPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformMember";
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

export async function patchHrmPlatformMemberTimesheetsTimesheetIdReject(props: {
  member: MemberPayload;
  timesheetId: string & tags.Format<"uuid">;
  body: IHrmPlatformTimesheet.IReject;
}): Promise<IHrmPlatformTimesheet> {
  // Validate rejection_reason is provided and not empty
  if (
    !props.body.rejection_reason ||
    props.body.rejection_reason.trim().length === 0
  ) {
    throw new HttpException(
      "Rejection reason is required and cannot be empty",
      400,
    );
  }
  // Query the member's employee record to verify time:approve permission
  const employee = await MyGlobal.prisma.hrm_platform_employees.findFirst({
    where: {
      member_id: props.member.id,
      deleted_at: null,
    },
    select: {
      id: true,
      role: {
        select: {
          id: true,
          name: true,
          built_in: true,
          permissions: {
            select: {
              permission: true,
            },
          },
        },
      },
    },
  });
  if (!employee) {
    throw new HttpException("Employee record not found", 404);
  }
  // Check if role has time:approve permission
  // Owner and Manager built-in roles have all permissions including time:approve
  // Custom roles need explicit time:approve permission
  const hasPermission =
    (employee.role.built_in &&
      (employee.role.name === "Owner" || employee.role.name === "Manager")) ||
    employee.role.permissions.some((p) => p.permission === "time:approve");
  if (!hasPermission) {
    throw new HttpException("Forbidden: Missing time:approve permission", 403);
  }
  // Find timesheet and verify it exists and is in submitted status
  const timesheet =
    await MyGlobal.prisma.hrm_platform_timesheets.findUniqueOrThrow({
      where: {
        id: props.timesheetId,
        deleted_at: null,
      },
      select: {
        id: true,
        status: true,
      },
    });
  // Validate status is 'submitted'
  if (timesheet.status !== "submitted") {
    throw new HttpException(
      `Cannot reject timesheet: current status is '${timesheet.status}'. Only timesheets in 'submitted' status can be rejected.`,
      400,
    );
  }
  // Update timesheet with rejection details
  await MyGlobal.prisma.hrm_platform_timesheets.update({
    where: {
      id: props.timesheetId,
    },
    data: {
      status: "rejected",
      reviewed_at: new Date(),
      reviewed_by_id: props.member.id,
      rejection_reason: props.body.rejection_reason,
      updated_at: new Date(),
    },
  });
  // Fetch updated timesheet with all relations for transformer
  const updated =
    await MyGlobal.prisma.hrm_platform_timesheets.findUniqueOrThrow({
      where: {
        id: props.timesheetId,
      },
      ...HrmPlatformTimesheetTransformer.select(),
    });
  return await HrmPlatformTimesheetTransformer.transform(updated);
}
