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
import { MemberPayload } from "../decorators/payload/MemberPayload";
import { ErpHrmTimesheetTransformer } from "../transformers/ErpHrmTimesheetTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function postErpHrmMemberTimesheetsTimesheetIdReject(props: {
  member: MemberPayload;
  timesheetId: string & tags.Format<"uuid">;
  body: IErpHrmTimesheet.IReject;
}): Promise<IErpHrmTimesheet> {
  // Step 1: Load the timesheet to get the owner's org_member record
  const timesheet = await MyGlobal.prisma.erp_hrm_timesheets.findUniqueOrThrow({
    where: { id: props.timesheetId },
    select: {
      id: true,
      status: true,
      organization_member_id: true,
      owner: {
        select: {
          organization_id: true,
        },
      },
    },
  });
  // Step 2: Find the calling member's org_member record in the same organization
  const callerOrgMember =
    await MyGlobal.prisma.erp_hrm_organization_members.findFirst({
      where: {
        member_id: props.member.id,
        organization_id: timesheet.owner.organization_id,
        deleted_at: null,
      },
      select: {
        id: true,
        role_id: true,
      },
    });
  if (callerOrgMember === null) {
    throw new HttpException("Forbidden", 403);
  }
  // Step 3: Check time:approve permission
  const approvePermission =
    await MyGlobal.prisma.erp_hrm_role_permissions.findFirst({
      where: {
        role_id: callerOrgMember.role_id,
        permission_code: "time:approve",
      },
      select: { id: true },
    });
  if (approvePermission === null) {
    throw new HttpException("Forbidden", 403);
  }
  // Step 4: Prevent self-rejection
  if (timesheet.organization_member_id === callerOrgMember.id) {
    throw new HttpException("Forbidden", 403);
  }
  // Step 5: Verify timesheet is in 'submitted' status
  if (timesheet.status !== "submitted") {
    throw new HttpException(
      "Timesheet must be in submitted status to be rejected",
      422,
    );
  }
  // Step 6: Validate rejection_reason is non-null and non-empty
  if (
    props.body.rejection_reason === null ||
    props.body.rejection_reason.trim().length === 0
  ) {
    throw new HttpException("A written rejection reason is required", 422);
  }
  // Step 7: Update the timesheet
  await MyGlobal.prisma.erp_hrm_timesheets.update({
    where: { id: props.timesheetId },
    data: {
      status: "rejected",
      reviewer_id: callerOrgMember.id,
      reviewed_at: new Date(),
      rejection_reason: props.body.rejection_reason,
      updated_at: new Date(),
    },
  });
  // Step 8: Return fully populated timesheet
  const updated = await MyGlobal.prisma.erp_hrm_timesheets.findUniqueOrThrow({
    where: { id: props.timesheetId },
    ...ErpHrmTimesheetTransformer.select(),
  });
  return ErpHrmTimesheetTransformer.transform(updated);
}
