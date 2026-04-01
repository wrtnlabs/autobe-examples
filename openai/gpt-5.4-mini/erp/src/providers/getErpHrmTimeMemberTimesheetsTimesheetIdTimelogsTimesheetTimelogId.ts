import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IErpHrmTimeDepartment } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimeDepartment";
import { IErpHrmTimeEmployee } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimeEmployee";
import { IErpHrmTimeMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimeMember";
import { IErpHrmTimeOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimeOrganization";
import { IErpHrmTimeProject } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimeProject";
import { IErpHrmTimeRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimeRole";
import { IErpHrmTimeTask } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimeTask";
import { IErpHrmTimeTimelog } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimeTimelog";
import { IErpHrmTimeTimesheet } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimeTimesheet";
import { IErpHrmTimeTimesheetTimelog } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimeTimesheetTimelog";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { MemberPayload } from "../decorators/payload/MemberPayload";
import { ErpHrmTimeTimelogAtSummaryTransformer } from "../transformers/ErpHrmTimeTimelogAtSummaryTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function getErpHrmTimeMemberTimesheetsTimesheetIdTimelogsTimesheetTimelogId(props: {
  member: MemberPayload;
  timesheetId: string & tags.Format<"uuid">;
  timesheetTimelogId: string & tags.Format<"uuid">;
}): Promise<IErpHrmTimeTimesheetTimelog> {
  const association =
    await MyGlobal.prisma.erp_hrm_time_timesheet_timelogs.findUniqueOrThrow({
      where: {
        id: props.timesheetTimelogId,
      },
      select: {
        id: true,
        erp_hrm_time_timesheet_id: true,
        created_at: true,
        updated_at: true,
        deleted_at: true,
        timesheet: {
          select: {
            id: true,
            erp_hrm_time_employee_id: true,
            status: true,
            week_start_date: true,
            week_end_date: true,
            submitted_at: true,
            reviewed_at: true,
            rejection_reason: true,
            reviewed_by_member_id: true,
            created_at: true,
            updated_at: true,
            deleted_at: true,
          },
        },
        timelog: ErpHrmTimeTimelogAtSummaryTransformer.select(),
      },
    });
  if (association.deleted_at !== null)
    throw new HttpException("Not Found", 404);
  if (association.erp_hrm_time_timesheet_id !== props.timesheetId)
    throw new HttpException("Not Found", 404);
  if (association.timesheet.deleted_at !== null)
    throw new HttpException("Not Found", 404);
  if (
    association.timesheet.erp_hrm_time_employee_id !== props.member.id &&
    association.timesheet.status !== "submitted"
  ) {
    throw new HttpException("Forbidden", 403);
  }
  return {
    id: association.id,
    timesheet: {
      id: association.timesheet.id,
      employee: {
        id: association.timesheet.erp_hrm_time_employee_id,
      } as IErpHrmTimeEmployee.ISummary,
      weekStartDate: association.timesheet.week_start_date.toISOString(),
      weekEndDate: association.timesheet.week_end_date.toISOString(),
      status: association.timesheet.status,
      submittedAt: association.timesheet.submitted_at?.toISOString() ?? null,
      reviewedAt: association.timesheet.reviewed_at?.toISOString() ?? null,
      rejectionReason: association.timesheet.rejection_reason,
      reviewedByMember: null,
      createdAt: association.timesheet.created_at.toISOString(),
      updatedAt: association.timesheet.updated_at.toISOString(),
      deletedAt: association.timesheet.deleted_at?.toISOString() ?? null,
    } as IErpHrmTimeTimesheet.ISummary,
    timelog: await ErpHrmTimeTimelogAtSummaryTransformer.transform(
      association.timelog,
    ),
    created_at: association.created_at.toISOString(),
    updated_at: association.updated_at.toISOString(),
    deleted_at: association.deleted_at?.toISOString() ?? null,
  };
}
