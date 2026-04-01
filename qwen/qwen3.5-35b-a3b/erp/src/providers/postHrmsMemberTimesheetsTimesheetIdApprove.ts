import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IHrmsEmployee } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmsEmployee";
import { IHrmsMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmsMember";
import { IHrmsProject } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmsProject";
import { IHrmsTimelog } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmsTimelog";
import { IHrmsTimesheet } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmsTimesheet";
import { IWeekRange } from "@ORGANIZATION/PROJECT-api/lib/structures/IWeekRange";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { MemberPayload } from "../decorators/payload/MemberPayload";
import { HrmsTimesheetTransformer } from "../transformers/HrmsTimesheetTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function postHrmsMemberTimesheetsTimesheetIdApprove(props: {
  member: MemberPayload;
  timesheetId: string & tags.Format<"uuid">;
}): Promise<IHrmsTimesheet> {
  const timesheet = await MyGlobal.prisma.hrms_timesheets.findUniqueOrThrow({
    where: { id: props.timesheetId },
  });
  if (timesheet.status !== "submitted") {
    throw new HttpException("Timesheet is not in submitted status", 400);
  }
  const member = await MyGlobal.prisma.hrms_members.findUniqueOrThrow({
    where: { id: props.member.id, deleted_at: null },
  });
  const employeeOrgMember =
    await MyGlobal.prisma.hrms_organization_members.findFirst({
      where: {
        hrms_member_id: timesheet.hrms_employee_id,
      },
      include: {
        organizationRole: {
          include: {
            permissions: true,
          },
        },
      },
    });
  if (!employeeOrgMember) {
    throw new HttpException("Employee organization membership not found", 403);
  }
  const approverOrgMember =
    await MyGlobal.prisma.hrms_organization_members.findFirst({
      where: {
        hrms_member_id: member.id,
        hrms_organization_id: employeeOrgMember.hrms_organization_id,
      },
      include: {
        organizationRole: {
          include: {
            permissions: true,
          },
        },
      },
    });
  if (!approverOrgMember) {
    throw new HttpException("Forbidden", 403);
  }
  const hasApprovePermission =
    approverOrgMember.organizationRole.permissions.some(
      (p: { permission: string }) => p.permission === "time:approve",
    );
  if (!hasApprovePermission) {
    throw new HttpException("Forbidden", 403);
  }
  const updated = await MyGlobal.prisma.hrms_timesheets.update({
    where: { id: props.timesheetId },
    data: {
      status: "approved",
      reviewed_by: member.id,
      reviewed_at: toISOStringSafe(new Date()),
      updated_at: toISOStringSafe(new Date()),
    },
    ...HrmsTimesheetTransformer.select(),
  });
  return await HrmsTimesheetTransformer.transform(updated);
}
