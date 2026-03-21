import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IErpHrmDepartment } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmDepartment";
import { IErpHrmEmployee } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmEmployee";
import { IErpHrmMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmMember";
import { IErpHrmOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmOrganization";
import { IErpHrmProjectMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmProjectMember";
import { IErpHrmRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmRole";
import { IErpHrmTask } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTask";
import { IErpHrmTimelog } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimelog";
import { IErpHrmTimesheet } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimesheet";
import { IErpHrmTimesheetTimelog } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimesheetTimelog";
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
  const reviewerEmployee =
    await MyGlobal.prisma.erp_hrm_employees.findFirstOrThrow({
      where: {
        erp_hrm_member_id: props.member.id,
        deleted_at: null,
      },
      select: {
        id: true,
        erp_hrm_organization_id: true,
        erp_hrm_role_id: true,
      },
    });
  const hasTimeApprovePermission =
    await MyGlobal.prisma.erp_hrm_role_permissions.findFirst({
      where: {
        erp_hrm_role_id: reviewerEmployee.erp_hrm_role_id,
        permission: "time:approve",
      },
    });
  if (!hasTimeApprovePermission) {
    throw new HttpException(
      "You do not have permission to reject timesheets",
      403,
    );
  }
  const timesheet = await MyGlobal.prisma.erp_hrm_timesheets.findFirstOrThrow({
    where: {
      id: props.timesheetId,
      employee: {
        erp_hrm_organization_id: reviewerEmployee.erp_hrm_organization_id,
      },
      deleted_at: null,
    },
    select: {
      id: true,
      status: true,
    },
  });
  if (timesheet.status !== "submitted") {
    throw new HttpException(
      "Cannot reject a timesheet that is not in submitted status",
      400,
    );
  }
  await MyGlobal.prisma.erp_hrm_timesheets.update({
    where: { id: props.timesheetId },
    data: {
      status: "rejected",
      rejection_reason: props.body.rejectionReason,
      reviewed_at: new Date(),
      reviewerEmployee: {
        connect: { id: reviewerEmployee.id },
      },
    },
  });
  await MyGlobal.prisma.erp_hrm_timesheet_timelogs.deleteMany({
    where: {
      erp_hrm_timesheet_id: props.timesheetId,
    },
  });
  const rejected = await MyGlobal.prisma.erp_hrm_timesheets.findFirstOrThrow({
    where: { id: props.timesheetId },
    ...ErpHrmTimesheetTransformer.select(),
  });
  return await ErpHrmTimesheetTransformer.transform(rejected);
}
