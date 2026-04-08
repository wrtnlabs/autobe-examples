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
import { ErpHrmTimeTimesheetTransformer } from "../transformers/ErpHrmTimeTimesheetTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function postErpHrmTimeMemberTimesheetsTimesheetIdSubmit(props: {
  member: MemberPayload;
  timesheetId: string & tags.Format<"uuid">;
}): Promise<IErpHrmTimeTimesheet> {
  const currentAt: string & tags.Format<"date-time"> = new Date().toISOString();
  const timesheet =
    await MyGlobal.prisma.erp_hrm_time_timesheets.findUniqueOrThrow({
      where: {
        id: props.timesheetId,
      },
      select: {
        id: true,
        status: true,
        erp_hrm_time_employee_id: true,
        employee: {
          select: {
            id: true,
            status: true,
            erp_hrm_time_member_id: true,
          },
        },
        timesheetTimelogs: {
          where: {
            deleted_at: null,
          },
          select: {
            id: true,
          },
        },
      },
    });
  if (timesheet.employee.erp_hrm_time_member_id !== props.member.id) {
    throw new HttpException(
      "This timesheet does not belong to the current member.",
      403,
    );
  }
  if (timesheet.employee.status !== "active") {
    throw new HttpException(
      "Deactivated employees cannot submit timesheets.",
      400,
    );
  }
  if (timesheet.status !== "draft") {
    throw new HttpException("Only draft timesheets can be submitted.", 400);
  }
  if (timesheet.timesheetTimelogs.length === 0) {
    throw new HttpException(
      "A timesheet must include at least one timelog before submission.",
      400,
    );
  }
  await MyGlobal.prisma.erp_hrm_time_timesheets.update({
    where: {
      id: props.timesheetId,
    },
    data: {
      status: "submitted",
      submitted_at: currentAt,
      reviewed_by_member_id: null,
      reviewed_at: null,
      rejection_reason: null,
      updated_at: currentAt,
    },
  });
  const updated =
    await MyGlobal.prisma.erp_hrm_time_timesheets.findUniqueOrThrow({
      where: {
        id: props.timesheetId,
      },
      ...ErpHrmTimeTimesheetTransformer.select(),
    });
  return await ErpHrmTimeTimesheetTransformer.transform(updated);
}
