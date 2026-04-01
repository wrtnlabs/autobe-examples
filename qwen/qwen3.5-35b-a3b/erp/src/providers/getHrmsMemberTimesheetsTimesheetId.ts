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

export async function getHrmsMemberTimesheetsTimesheetId(props: {
  member: MemberPayload;
  timesheetId: string & tags.Format<"uuid">;
}): Promise<IHrmsTimesheet> {
  const { member, timesheetId } = props;
  // Fetch the timesheet with proper selection
  const timesheet = await MyGlobal.prisma.hrms_timesheets.findUniqueOrThrow({
    where: {
      id: timesheetId,
      deleted_at: null,
    },
    ...HrmsTimesheetTransformer.select(),
  });
  // Authorization: member must own the timesheet
  // Check if the employee belongs to this member's organization by verifying the organization_member link
  const orgMember = await MyGlobal.prisma.hrms_organization_members.findFirst({
    where: {
      member: { id: member.id },
      employees: {
        some: {
          id: timesheet.employee.id,
        },
      },
    },
  });
  if (orgMember === null) {
    throw new HttpException("Forbidden", 403);
  }
  return await HrmsTimesheetTransformer.transform(timesheet);
}
