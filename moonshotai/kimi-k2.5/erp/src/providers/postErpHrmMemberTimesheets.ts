import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IErpHrmDepartment } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmDepartment";
import { IErpHrmMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmMember";
import { IErpHrmOrganizationMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmOrganizationMember";
import { IErpHrmProject } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmProject";
import { IErpHrmRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmRole";
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
  // Find the organization member record for the authenticated user
  const organizationMember =
    await MyGlobal.prisma.erp_hrm_organization_members.findFirstOrThrow({
      where: {
        user_id: props.member.id,
        deleted_at: null,
      },
      select: {
        id: true,
      },
    });
  // Check for duplicate timesheet (unique constraint: organization_member_id + week_start_date)
  const weekStartDate = new Date(props.body.weekStartDate);
  const existingTimesheet = await MyGlobal.prisma.erp_hrm_timesheets.findFirst({
    where: {
      organization_member_id: organizationMember.id,
      week_start_date: weekStartDate,
      deleted_at: null,
    },
  });
  if (existingTimesheet !== null) {
    throw new HttpException("A timesheet already exists for this week", 409);
  }
  // Collect data using the collector
  const createData = await ErpHrmTimesheetCollector.collect({
    body: props.body,
    erpHrmOrganizationMembers: { id: organizationMember.id },
  });
  // Create the timesheet
  const created = await MyGlobal.prisma.erp_hrm_timesheets.create({
    data: createData,
  });
  // Fetch the complete record with all relations for transformation
  const timesheet = await MyGlobal.prisma.erp_hrm_timesheets.findUniqueOrThrow({
    where: { id: created.id },
    ...ErpHrmTimesheetTransformer.select(),
  });
  return await ErpHrmTimesheetTransformer.transform(timesheet);
}
