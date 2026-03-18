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
    select: {
      id: true,
      hrms_employee_id: true,
      status: true,
    },
  });
  if (timesheet.status !== "submitted") {
    throw new HttpException("Timesheet is not in submitted status", 400);
  }
  const employee = await MyGlobal.prisma.hrms_employees.findFirstOrThrow({
    where: {
      id: timesheet.hrms_employee_id,
      deleted_at: null,
    },
    select: {
      organization_member_id: true,
    },
  });
  const organizationMember =
    await MyGlobal.prisma.hrms_organization_members.findFirstOrThrow({
      where: {
        id: employee.organization_member_id,
        deleted_at: null,
      },
      select: {
        hrms_organization_id: true,
        hrms_organization_role_id: true,
      },
    });
  const memberOrganizationMember =
    await MyGlobal.prisma.hrms_organization_members.findFirst({
      where: {
        hrms_member_id: props.member.id,
        hrms_organization_id: organizationMember.hrms_organization_id,
        deleted_at: null,
      },
      select: {
        hrms_organization_role_id: true,
      },
    });
  if (!memberOrganizationMember) {
    throw new HttpException("User is not a member of this organization", 403);
  }
  const rolePermissions =
    await MyGlobal.prisma.hrms_organization_role_permissions.findMany({
      where: {
        hrms_organization_role_id:
          memberOrganizationMember.hrms_organization_role_id,
        permission: "time:approve",
      },
    });
  if (rolePermissions.length === 0) {
    throw new HttpException("User lacks time:approve permission", 403);
  }
  const updatedTimesheet = await MyGlobal.prisma.hrms_timesheets.update({
    where: { id: props.timesheetId },
    data: {
      status: "approved",
      reviewed_by: props.member.id,
      reviewed_at: new Date(),
      updated_at: new Date(),
    },
    ...HrmsTimesheetTransformer.select(),
  });
  return await HrmsTimesheetTransformer.transform(updatedTimesheet);
}
