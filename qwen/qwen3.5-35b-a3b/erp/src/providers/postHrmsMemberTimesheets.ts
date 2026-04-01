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
  const organizationMember =
    await MyGlobal.prisma.hrms_organization_members.findFirst({
      where: {
        hrms_member_id: props.member.id,
        deleted_at: null,
      },
    });
  if (organizationMember === null) {
    throw new HttpException("Organization membership not found", 404);
  }
  const employee = await MyGlobal.prisma.hrms_employees.findFirst({
    where: {
      organization_member_id: organizationMember.id,
      deleted_at: null,
    },
  });
  if (employee === null) {
    throw new HttpException("Employee not found", 404);
  }
  const existingTimesheet = await MyGlobal.prisma.hrms_timesheets.findFirst({
    where: {
      hrms_employee_id: employee.id,
      week_start_date: props.body.week_start_date,
      status: {
        in: ["submitted", "approved"],
      },
      deleted_at: null,
    },
  });
  if (existingTimesheet !== null) {
    throw new HttpException("Timesheet already exists for this week", 409);
  }
  const created = await MyGlobal.prisma.hrms_timesheets.create({
    data: await HrmsTimesheetCollector.collect({
      body: props.body,
      hrmsEmployees: employee,
    }),
  });
  const result = await MyGlobal.prisma.hrms_timesheets.findUniqueOrThrow({
    where: { id: created.id },
    ...HrmsTimesheetTransformer.select(),
  });
  return await HrmsTimesheetTransformer.transform(result);
}
