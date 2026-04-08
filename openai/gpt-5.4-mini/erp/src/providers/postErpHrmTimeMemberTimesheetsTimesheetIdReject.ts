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

export async function postErpHrmTimeMemberTimesheetsTimesheetIdReject(props: {
  member: MemberPayload;
  timesheetId: string & tags.Format<"uuid">;
  body: IErpHrmTimeTimesheet.IReject;
}): Promise<IErpHrmTimeTimesheet> {
  if (props.body.rejectionReason === null) {
    throw new HttpException("Rejection reason is required.", 400);
  }
  const timesheet =
    await MyGlobal.prisma.erp_hrm_time_timesheets.findUniqueOrThrow({
      where: {
        id: props.timesheetId,
      },
      select: {
        id: true,
        status: true,
        deleted_at: true,
        reviewed_by_member_id: true,
      },
    });
  if (timesheet.deleted_at !== null) {
    throw new HttpException("Timesheet not found.", 404);
  }
  if (timesheet.status !== "submitted") {
    throw new HttpException("Only submitted timesheets can be rejected.", 409);
  }
  await MyGlobal.prisma.erp_hrm_time_timesheets.update({
    where: {
      id: props.timesheetId,
    },
    data: {
      status: "draft",
      reviewed_by_member_id: props.member.id,
      reviewed_at: new Date(),
      rejection_reason: props.body.rejectionReason,
      updated_at: new Date(),
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
