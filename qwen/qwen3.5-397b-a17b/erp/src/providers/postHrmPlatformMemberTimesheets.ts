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
import { HrmPlatformTimesheetCollector } from "../collectors/HrmPlatformTimesheetCollector";
import { MemberPayload } from "../decorators/payload/MemberPayload";
import { HrmPlatformTimesheetTransformer } from "../transformers/HrmPlatformTimesheetTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function postHrmPlatformMemberTimesheets(props: {
  member: MemberPayload;
  body: IHrmPlatformTimesheet.ICreate;
}): Promise<IHrmPlatformTimesheet> {
  const employee = await MyGlobal.prisma.hrm_platform_employees.findFirst({
    where: {
      member_id: props.member.id,
      deleted_at: null,
    },
    select: {
      id: true,
    },
  });
  if (!employee) {
    throw new HttpException("Employee record not found", 404);
  }
  const weekStartDate = new Date(props.body.week_start_date);
  const weekEndDate = new Date(weekStartDate);
  weekEndDate.setDate(weekEndDate.getDate() + 6);
  const existing = await MyGlobal.prisma.hrm_platform_timesheets.findFirst({
    where: {
      employee_id: employee.id,
      week_start_date: weekStartDate,
      deleted_at: null,
    },
  });
  if (existing) {
    throw new HttpException("Timesheet already exists for this week", 409);
  }
  const created = await MyGlobal.prisma.hrm_platform_timesheets.create({
    data: await HrmPlatformTimesheetCollector.collect({
      body: props.body,
      hrmPlatformEmployees: { id: employee.id },
      hrmPlatformMemberSessions: { id: props.member.session_id },
    }),
    ...HrmPlatformTimesheetTransformer.select(),
  });
  return await HrmPlatformTimesheetTransformer.transform(created);
}
