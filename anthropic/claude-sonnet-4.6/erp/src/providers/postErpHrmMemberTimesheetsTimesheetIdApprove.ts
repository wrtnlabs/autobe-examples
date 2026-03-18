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

export async function postErpHrmMemberTimesheetsTimesheetIdApprove(props: {
  member: MemberPayload;
  timesheetId: string & tags.Format<"uuid">;
}): Promise<IErpHrmTimesheet> {
  // Step 1: Load the target timesheet to get its organization context
  const timesheet = await MyGlobal.prisma.erp_hrm_timesheets.findUniqueOrThrow({
    where: { id: props.timesheetId },
    select: {
      id: true,
      organization_member_id: true,
      status: true,
    },
  });
  // Step 2: Load the timesheet owner's org member to get organization_id
  const timesheetOwnerMember =
    await MyGlobal.prisma.erp_hrm_organization_members.findUniqueOrThrow({
      where: { id: timesheet.organization_member_id },
      select: {
        id: true,
        organization_id: true,
      },
    });
  // Step 3: Find the acting member's org membership in the same organization
  const actingMember =
    await MyGlobal.prisma.erp_hrm_organization_members.findFirst({
      where: {
        member_id: props.member.id,
        organization_id: timesheetOwnerMember.organization_id,
        deleted_at: null,
      },
      select: {
        id: true,
        status: true,
        role_id: true,
      },
    });
  // Step 4: Acting member must exist in the same organization
  if (actingMember === null) {
    throw new HttpException(
      "Forbidden: not a member of this organization",
      403,
    );
  }
  // Step 5: Acting member must be active
  if (actingMember.status === "deactivated") {
    throw new HttpException("Forbidden: deactivated member", 403);
  }
  // Step 6: Check time:approve permission
  const permission = await MyGlobal.prisma.erp_hrm_role_permissions.findFirst({
    where: {
      role_id: actingMember.role_id,
      permission_code: "time:approve",
    },
    select: { id: true },
  });
  if (permission === null) {
    throw new HttpException("Forbidden: missing time:approve permission", 403);
  }
  // Step 7: Self-approval check
  if (actingMember.id === timesheet.organization_member_id) {
    throw new HttpException("Forbidden: cannot approve own timesheet", 403);
  }
  // Step 8: Timesheet must be in submitted status
  if (timesheet.status !== "submitted") {
    throw new HttpException(
      `Unprocessable: timesheet status is '${timesheet.status}', must be 'submitted' to approve`,
      422,
    );
  }
  // Step 9: Update the timesheet
  await MyGlobal.prisma.erp_hrm_timesheets.update({
    where: { id: props.timesheetId },
    data: {
      status: "approved",
      reviewer_id: actingMember.id,
      reviewed_at: new Date(),
      updated_at: new Date(),
    },
  });
  // Step 10: Reload and transform
  const updated = await MyGlobal.prisma.erp_hrm_timesheets.findUniqueOrThrow({
    where: { id: props.timesheetId },
    ...ErpHrmTimesheetTransformer.select(),
  });
  return ErpHrmTimesheetTransformer.transform(updated);
}
