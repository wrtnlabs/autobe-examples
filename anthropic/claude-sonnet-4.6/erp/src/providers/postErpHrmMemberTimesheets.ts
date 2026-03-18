import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IErpHrmDepartment } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmDepartment";
import { IErpHrmMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmMember";
import { IErpHrmOrganizationMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmOrganizationMember";
import { IErpHrmProject } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmProject";
import { IErpHrmRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmRole";
import { IErpHrmRolePermission } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmRolePermission";
import { IErpHrmTask } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTask";
import { IErpHrmTimelog } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimelog";
import { IErpHrmTimesheet } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimesheet";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { ErpHrmTimesheetCollector } from "../collectors/ErpHrmTimesheetCollector";
import { MemberPayload } from "../decorators/payload/MemberPayload";
import { ErpHrmTimesheetTransformer } from "../transformers/ErpHrmTimesheetTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function postErpHrmMemberTimesheets(props: {
  member: MemberPayload;
  body: IErpHrmTimesheet.ICreate;
}): Promise<IErpHrmTimesheet> {
  // Step 1: Resolve organization member from authenticated member id
  const organizationMember =
    await MyGlobal.prisma.erp_hrm_organization_members.findFirstOrThrow({
      where: {
        member_id: props.member.id,
        deleted_at: null,
      },
      select: {
        id: true,
        status: true,
      },
    });
  // Step 2: Only active members may create timesheets
  if (organizationMember.status !== "active") {
    throw new HttpException("Forbidden", 403);
  }
  // Step 3: Validate weekStartDate is a Monday (UTC weekday === 1)
  const weekStart = new Date(props.body.weekStartDate);
  if (weekStart.getUTCDay() !== 1) {
    throw new HttpException("Unprocessable Entity", 422);
  }
  // Step 4: Validate weekEndDate is exactly the Sunday 6 days later
  const weekEnd = new Date(props.body.weekEndDate);
  const sixDaysMs = 6 * 24 * 60 * 60 * 1000;
  if (
    weekEnd.getUTCDay() !== 0 ||
    weekEnd.getTime() - weekStart.getTime() !== sixDaysMs
  ) {
    throw new HttpException("Unprocessable Entity", 422);
  }
  // Step 5: Uniqueness check — no duplicate timesheet for same member/week
  const existing = await MyGlobal.prisma.erp_hrm_timesheets.findFirst({
    where: {
      organization_member_id: organizationMember.id,
      week_start_date: weekStart,
    },
    select: { id: true },
  });
  if (existing !== null) {
    throw new HttpException("Conflict", 409);
  }
  // Step 6: Create the timesheet using the collector + transformer
  const created = await MyGlobal.prisma.erp_hrm_timesheets.create({
    data: await ErpHrmTimesheetCollector.collect({
      body: props.body,
      erpHrmOrganizationMembers: { id: organizationMember.id },
      erpHrmMemberSessions: { id: props.member.session_id },
    }),
    ...ErpHrmTimesheetTransformer.select(),
  });
  // Step 7: Transform and return
  return ErpHrmTimesheetTransformer.transform(created);
}
