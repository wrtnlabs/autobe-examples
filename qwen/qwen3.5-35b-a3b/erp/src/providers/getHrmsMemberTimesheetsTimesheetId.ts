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
  const session = await MyGlobal.prisma.hrms_member_sessions.findFirst({
    where: {
      hrms_member_id: props.member.id,
      id: props.member.session_id,
      expired_at: { gt: new Date() },
    },
  });
  if (session === null) {
    throw new HttpException("Unauthorized", 401);
  }
  if (session.current_organization_id === null) {
    throw new HttpException("Forbidden", 403);
  }
  const organizationMember =
    await MyGlobal.prisma.hrms_organization_members.findFirst({
      where: {
        hrms_member_id: props.member.id,
        hrms_organization_id: session.current_organization_id,
        deleted_at: null,
      },
      include: {
        organizationRole: true,
      },
    });
  if (organizationMember === null) {
    throw new HttpException("Forbidden", 403);
  }
  const hasTimeApprovePermission = false;
  const timesheet = await MyGlobal.prisma.hrms_timesheets.findUniqueOrThrow({
    where: { id: props.timesheetId },
    ...HrmsTimesheetTransformer.select(),
  });
  if (timesheet.deleted_at !== null) {
    throw new HttpException("Not Found", 404);
  }
  if (!hasTimeApprovePermission) {
    if (session.current_organization_id === null) {
      throw new HttpException("Forbidden", 403);
    }
    const employeeOrgMember =
      await MyGlobal.prisma.hrms_organization_members.findFirst({
        where: {
          hrms_member_id: timesheet.employee.id,
          hrms_organization_id: session.current_organization_id,
          deleted_at: null,
        },
      });
    if (
      employeeOrgMember === null ||
      employeeOrgMember.hrms_organization_id !== session.current_organization_id
    ) {
      throw new HttpException("Forbidden", 403);
    }
  }
  const prismaTimelogs = await MyGlobal.prisma.hrms_timelogs.findMany({
    where: {
      employee_id: timesheet.employee.id,
      ...(timesheet.status === "approved" ? {} : { deleted_at: null }),
    },
  });
  const transformed = await HrmsTimesheetTransformer.transform(timesheet);
  const timelogs = prismaTimelogs as unknown as IHrmsTimelog[];
  return {
    ...transformed,
    timelogs,
  };
}
