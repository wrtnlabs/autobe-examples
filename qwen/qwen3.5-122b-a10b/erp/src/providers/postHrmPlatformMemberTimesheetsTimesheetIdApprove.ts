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

export async function postHrmPlatformMemberTimesheetsTimesheetIdApprove(props: {
  member: MemberPayload;
  timesheetId: string & tags.Format<"uuid">;
}): Promise<IHrmPlatformTimesheet> {
  // Step 1: Find and validate the timesheet exists
  const timesheet =
    await MyGlobal.prisma.hrm_platform_timesheets.findUniqueOrThrow({
      where: { id: props.timesheetId },
      select: {
        id: true,
        status: true,
        hrm_platform_employee_id: true,
        hrm_platform_member_id: true,
        reviewed_at: true,
      },
    });
  // Step 2: Verify status is 'submitted' - only submitted timesheets can be approved
  if (timesheet.status !== "submitted") {
    throw new HttpException(
      `Timesheet is not in submitted status (current: ${timesheet.status})`,
      400,
    );
  }
  // Step 3: Update the timesheet to approved status
  await MyGlobal.prisma.hrm_platform_timesheets.update({
    where: { id: props.timesheetId },
    data: {
      status: "approved",
      hrm_platform_member_id: props.member.id,
      reviewed_at: new Date(),
      updated_at: new Date(),
    },
  });
  // Step 4: Query the updated timesheet with all required relations
  const updated =
    await MyGlobal.prisma.hrm_platform_timesheets.findUniqueOrThrow({
      where: { id: props.timesheetId },
      ...HrmPlatformTimesheetTransformer.select(),
    });
  // Step 5: Transform to DTO and return
  return await HrmPlatformTimesheetTransformer.transform(updated);
}
