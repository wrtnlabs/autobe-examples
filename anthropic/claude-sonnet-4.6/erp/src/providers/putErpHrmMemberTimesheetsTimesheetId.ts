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

export async function putErpHrmMemberTimesheetsTimesheetId(props: {
  member: MemberPayload;
  timesheetId: string & tags.Format<"uuid">;
  body: IErpHrmTimesheet.IUpdate;
}): Promise<IErpHrmTimesheet> {
  // Step 1: Fetch the timesheet record (auto-404 if not found)
  const timesheet = await MyGlobal.prisma.erp_hrm_timesheets.findUniqueOrThrow({
    where: { id: props.timesheetId },
    select: {
      id: true,
      organization_member_id: true,
      status: true,
      timelogs: {
        select: { id: true },
      },
      owner: {
        select: {
          id: true,
          organization_id: true,
          member_id: true,
          role_id: true,
        },
      },
    },
  });
  const organizationId = timesheet.owner.organization_id;
  // Step 2: Resolve the calling member's organization member record
  const callerOrgMember =
    await MyGlobal.prisma.erp_hrm_organization_members.findFirst({
      where: {
        organization_id: organizationId,
        member_id: props.member.id,
        deleted_at: null,
      },
      select: {
        id: true,
        role_id: true,
      },
    });
  if (callerOrgMember === null) {
    throw new HttpException(
      "Forbidden: not a member of this organization",
      403,
    );
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
  const hasTimeApprove = approvePermission !== null;
  const currentStatus = timesheet.status;
  const targetStatus = props.body.status;
  const isOwner = timesheet.organization_member_id === callerOrgMember.id;
  // Step 4: Validate status transition + authorization
  const isDraftToSubmitted =
    (currentStatus === "draft" || currentStatus === "rejected") &&
    targetStatus === "submitted";
  const isSubmittedToApproved =
    currentStatus === "submitted" && targetStatus === "approved";
  const isSubmittedToRejected =
    currentStatus === "submitted" && targetStatus === "rejected";
  if (isDraftToSubmitted && !isOwner) {
    throw new HttpException(
      "Forbidden: only the timesheet owner can submit",
      403,
    );
  }
  if ((isSubmittedToApproved || isSubmittedToRejected) && !hasTimeApprove) {
    throw new HttpException("Forbidden: time:approve permission required", 403);
  }
  if (!isDraftToSubmitted && !isSubmittedToApproved && !isSubmittedToRejected) {
    throw new HttpException(
      "Unprocessable Entity: invalid status transition",
      422,
    );
  }
  // Step 5: For submission, verify at least one timelog exists
  if (isDraftToSubmitted && timesheet.timelogs.length === 0) {
    throw new HttpException(
      "Unprocessable Entity: cannot submit a timesheet with no timelogs",
      422,
    );
  }
  // Step 6: For rejection, verify rejection_reason is provided and non-empty
  if (isSubmittedToRejected) {
    const reason = props.body.rejection_reason;
    if (!reason || reason.trim().length === 0) {
      throw new HttpException(
        "Unprocessable Entity: rejection_reason is required when rejecting a timesheet",
        422,
      );
    }
  }
  const now = new Date();
  // Step 7: Determine activity log action type and details
  const activityActionType = isDraftToSubmitted
    ? "timesheet_submitted"
    : isSubmittedToApproved
      ? "timesheet_approved"
      : "timesheet_rejected";
  const activityDetails = isSubmittedToRejected
    ? (props.body.rejection_reason ?? null)
    : null;
  // Step 8: Execute update + activity log in a transaction
  await MyGlobal.prisma.$transaction(async (tx) => {
    if (isDraftToSubmitted) {
      await tx.erp_hrm_timesheets.update({
        where: { id: props.timesheetId },
        data: {
          status: "submitted",
          submitted_at: now,
          reviewer_id: null,
          reviewed_at: null,
          rejection_reason: null,
          updated_at: now,
        },
      });
    } else if (isSubmittedToApproved) {
      await tx.erp_hrm_timesheets.update({
        where: { id: props.timesheetId },
        data: {
          status: "approved",
          reviewer_id: callerOrgMember.id,
          reviewed_at: now,
          rejection_reason: null,
          updated_at: now,
        },
      });
    } else {
      await tx.erp_hrm_timesheets.update({
        where: { id: props.timesheetId },
        data: {
          status: "rejected",
          reviewer_id: callerOrgMember.id,
          reviewed_at: now,
          rejection_reason: props.body.rejection_reason ?? null,
          updated_at: now,
        },
      });
    }
    await tx.erp_hrm_activity_logs.create({
      data: {
        id: v4(),
        organization_id: organizationId,
        organization_member_id: callerOrgMember.id,
        action_type: activityActionType,
        target_entity_type: "timesheet",
        target_entity_id: props.timesheetId,
        details: activityDetails,
        created_at: now,
      },
    });
  });
  // Step 9: Fetch and return the updated timesheet
  const updated = await MyGlobal.prisma.erp_hrm_timesheets.findUniqueOrThrow({
    where: { id: props.timesheetId },
    ...ErpHrmTimesheetTransformer.select(),
  });
  return ErpHrmTimesheetTransformer.transform(updated);
}
