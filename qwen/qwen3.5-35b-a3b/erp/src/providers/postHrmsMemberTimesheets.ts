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
import { HrmsTimesheetCollector } from "../collectors/HrmsTimesheetCollector";
import { MemberPayload } from "../decorators/payload/MemberPayload";
import { HrmsTimesheetTransformer } from "../transformers/HrmsTimesheetTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function postHrmsMemberTimesheets(props: {
  member: MemberPayload;
  body: IHrmsTimesheet.ICreate;
}): Promise<IHrmsTimesheet> {
  // Step 1: Validate session
  const session = await MyGlobal.prisma.hrms_member_sessions.findFirstOrThrow({
    where: {
      id: props.member.session_id,
      hrms_member_id: props.member.id,
      expired_at: { gt: new Date() },
    },
    select: {
      hrms_member_id: true,
    },
  });
  // Step 2: Find the organization member record and get employee_id
  const organizationMember =
    await MyGlobal.prisma.hrms_organization_members.findFirstOrThrow({
      where: {
        hrms_member_id: session.hrms_member_id,
        deleted_at: null,
      },
      select: {
        hrms_employee_id: true,
      },
    });
  // Step 3: Validate no existing submitted/approved timesheet for same week
  const existingTimesheet = await MyGlobal.prisma.hrms_timesheets.findFirst({
    where: {
      hrms_employee_id: organizationMember.hrms_employee_id,
      week_start_date: props.body.week_start_date,
      status: {
        in: ["submitted", "approved"],
      },
      deleted_at: null,
    },
    select: { id: true },
  });
  if (existingTimesheet !== null) {
    throw new HttpException(
      "Timesheet for this week already exists with submitted or approved status",
      409,
    );
  }
  // Step 4: Use collector to transform body into database input
  const createData = await HrmsTimesheetCollector.collect({
    body: props.body,
    hrmsMemberSessions: { id: session.hrms_member_id },
    hrmsOrganizationMembers: { id: organizationMember.id },
    hrmsMembers: { id: organizationMember.hrms_employee_id },
  });
  // Step 5: Create timesheet record
  const created = await MyGlobal.prisma.hrms_timesheets.create({
    data: createData,
    ...HrmsTimesheetTransformer.select(),
  });
  // Step 6: Transform and return
  return await HrmsTimesheetTransformer.transform(created);
}
