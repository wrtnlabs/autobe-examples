import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IErpHrmTimeDepartment } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimeDepartment";
import { IErpHrmTimeEmployeeDashboardSummary } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimeEmployeeDashboardSummary";
import { IErpHrmTimeMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimeMember";
import { IErpHrmTimeOrganizationDashboardSummary } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimeOrganizationDashboardSummary";
import { IErpHrmTimeProject } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimeProject";
import { IErpHrmTimeRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimeRole";
import { IErpHrmTimeTaskHistoryEntry } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimeTaskHistoryEntry";
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
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function getErpHrmTimeMemberTimesheetsTimesheetId(props: {
  member: MemberPayload;
  timesheetId: string & tags.Format<"uuid">;
}): Promise<IErpHrmTimeTimesheet> {
  const timesheet =
    await MyGlobal.prisma.erp_hrm_time_timesheets.findUniqueOrThrow({
      where: { id: props.timesheetId },
      select: {
        id: true,
        employee: {
          select: {
            id: true,
            organization: {
              select: {
                id: true,
              },
            },
          },
        },
        reviewedByMember: {
          select: {
            id: true,
          },
        },
        week_start_date: true,
        week_end_date: true,
        status: true,
        submitted_at: true,
        reviewed_at: true,
        rejection_reason: true,
        created_at: true,
        updated_at: true,
        deleted_at: true,
        timesheetTimelogs: {
          select: {
            id: true,
            created_at: true,
            updated_at: true,
            deleted_at: true,
            timesheet: {
              select: {
                id: true,
              },
            },
            timelog: {
              select: {
                id: true,
              },
            },
          },
        },
      },
    });
  if (timesheet.employee.organization.id !== props.member.id) {
    throw new HttpException("Not Found", 404);
  }
  if (timesheet.employee.id !== props.member.id) {
    const approval =
      await MyGlobal.prisma.erp_hrm_time_organization_memberships.findFirst({
        where: {
          erp_hrm_time_organization_id: timesheet.employee.organization.id,
          erp_hrm_time_member_id: props.member.id,
          status: "active",
        },
        select: {
          id: true,
        },
      });
    const canApprove = approval !== null;
    if (timesheet.status !== "submitted" || canApprove === false) {
      throw new HttpException("Forbidden", 403);
    }
  }
  return timesheet as unknown as IErpHrmTimeTimesheet;
}
