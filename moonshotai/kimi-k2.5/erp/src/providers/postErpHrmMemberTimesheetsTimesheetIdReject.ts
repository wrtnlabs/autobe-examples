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
import { MemberPayload } from "../decorators/payload/MemberPayload";
import { ErpHrmTimesheetTransformer } from "../transformers/ErpHrmTimesheetTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function postErpHrmMemberTimesheetsTimesheetIdReject(props: {
  member: MemberPayload;
  timesheetId: string;
  body: IErpHrmTimesheet.IReject;
}): Promise<IErpHrmTimesheet> {
  // Find the timesheet and verify it exists
  const timesheet = await MyGlobal.prisma.erp_hrm_timesheets.findUniqueOrThrow({
    where: { id: props.timesheetId },
    select: {
      id: true,
      status: true,
      organization_member_id: true,
    },
  });
  // Verify timesheet is in submitted status
  if (timesheet.status !== "submitted") {
    throw new HttpException("Only submitted timesheets can be reviewed", 400);
  }
  // Validate rejection reason is provided
  if (
    !props.body.rejectionReason ||
    props.body.rejectionReason.trim().length === 0
  ) {
    throw new HttpException("Rejection reason is required", 400);
  }
  // Update the timesheet with rejection details
  const updated = await MyGlobal.prisma.erp_hrm_timesheets.update({
    where: { id: props.timesheetId },
    data: {
      status: "rejected",
      reviewed_by_id: props.member.id,
      reviewed_at: new Date(),
      rejection_reason: props.body.rejectionReason,
      submitted_at: null,
    },
    ...ErpHrmTimesheetTransformer.select(),
  });
  return ErpHrmTimesheetTransformer.transform(updated);
}
