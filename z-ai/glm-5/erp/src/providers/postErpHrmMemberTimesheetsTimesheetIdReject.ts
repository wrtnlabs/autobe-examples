import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IErpHrmDepartment } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmDepartment";
import { IErpHrmEmployee } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmEmployee";
import { IErpHrmMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmMember";
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
  timesheetId: string & tags.Format<"uuid">;
  body: IErpHrmTimesheet.IReject;
}): Promise<IErpHrmTimesheet> {
  // Find the timesheet
  const timesheet = await MyGlobal.prisma.erp_hrm_timesheets.findUniqueOrThrow({
    where: { id: props.timesheetId },
    select: {
      id: true,
      status: true,
    },
  });
  // Validate status is 'submitted'
  if (timesheet.status !== "submitted") {
    throw new HttpException(
      "Timesheet must be in submitted status to be rejected",
      400,
    );
  }
  // Validate rejection reason is provided
  if (
    !props.body.rejection_reason ||
    props.body.rejection_reason.trim().length === 0
  ) {
    throw new HttpException("Rejection reason is required", 400);
  }
  // Update the timesheet with rejection
  const updated = await MyGlobal.prisma.erp_hrm_timesheets.update({
    where: { id: props.timesheetId },
    data: {
      status: "rejected",
      reviewer_id: props.member.id,
      reviewed_at: new Date(),
      rejection_reason: props.body.rejection_reason,
      updated_at: new Date(),
    },
    ...ErpHrmTimesheetTransformer.select(),
  });
  // Return using transformer
  return ErpHrmTimesheetTransformer.transform(updated);
}
