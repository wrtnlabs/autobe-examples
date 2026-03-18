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

export async function putErpHrmMemberTimesheetsTimesheetId(props: {
  member: MemberPayload;
  timesheetId: string;
  body: IErpHrmTimesheet.IUpdate;
}): Promise<IErpHrmTimesheet> {
  // Find the timesheet and verify ownership
  const timesheet = await MyGlobal.prisma.erp_hrm_timesheets.findUnique({
    where: { id: props.timesheetId },
    select: {
      id: true,
      organization_member_id: true,
      status: true,
      week_start_date: true,
      week_end_date: true,
    },
  });
  if (timesheet === null) {
    throw new HttpException("Timesheet not found", 404);
  }
  // Get the organization member for this user
  const orgMember =
    await MyGlobal.prisma.erp_hrm_organization_members.findFirst({
      where: {
        user_id: props.member.id,
        deleted_at: null,
      },
      select: { id: true },
    });
  if (orgMember === null) {
    throw new HttpException("Organization member not found", 403);
  }
  // Verify ownership
  if (timesheet.organization_member_id !== orgMember.id) {
    throw new HttpException(
      "Forbidden - timesheet does not belong to you",
      403,
    );
  }
  // Verify timesheet is in draft status
  if (timesheet.status !== "draft") {
    throw new HttpException(
      `Cannot update timesheet with status '${timesheet.status}'. Only draft timesheets can be updated.`,
      403,
    );
  }
  const weekStart = timesheet.week_start_date;
  const weekEnd = timesheet.week_end_date;
  // Process timelogs to remove
  if (
    props.body.timelogsToRemove !== undefined &&
    props.body.timelogsToRemove.length > 0
  ) {
    // Verify all timelogs belong to this timesheet
    const timelogsToRemove = await MyGlobal.prisma.erp_hrm_timelogs.findMany({
      where: {
        id: { in: props.body.timelogsToRemove },
        timesheet_id: timesheet.id,
      },
      select: { id: true },
    });
    if (timelogsToRemove.length !== props.body.timelogsToRemove.length) {
      throw new HttpException(
        "Some timelogs to remove do not belong to this timesheet",
        400,
      );
    }
    // Dissociate timelogs by setting timesheet_id to null
    await MyGlobal.prisma.erp_hrm_timelogs.updateMany({
      where: {
        id: { in: props.body.timelogsToRemove },
      },
      data: {
        timesheet_id: null,
        updated_at: new Date(),
      },
    });
  }
  // Process timelogs to add
  if (
    props.body.timelogsToAdd !== undefined &&
    props.body.timelogsToAdd.length > 0
  ) {
    // Verify all timelogs exist, belong to same member, have no timesheet, and are within week period
    const timelogsToAdd = await MyGlobal.prisma.erp_hrm_timelogs.findMany({
      where: {
        id: { in: props.body.timelogsToAdd },
        organization_member_id: orgMember.id,
        timesheet_id: null,
        deleted_at: null,
      },
      select: {
        id: true,
        start_time: true,
      },
    });
    if (timelogsToAdd.length !== props.body.timelogsToAdd.length) {
      throw new HttpException(
        "Some timelogs to add are invalid - they may not exist, already belong to a timesheet, or belong to another member",
        400,
      );
    }
    // Verify all timelogs fall within the timesheet week period
    for (const timelog of timelogsToAdd) {
      if (timelog.start_time < weekStart || timelog.start_time > weekEnd) {
        throw new HttpException(
          `Timelog ${timelog.id} falls outside the timesheet week period`,
          400,
        );
      }
    }
    // Associate timelogs with this timesheet
    await MyGlobal.prisma.erp_hrm_timelogs.updateMany({
      where: {
        id: { in: props.body.timelogsToAdd },
      },
      data: {
        timesheet_id: timesheet.id,
        updated_at: new Date(),
      },
    });
  }
  // Update timesheet status and rejection_reason if provided
  const updateData: Prisma.erp_hrm_timesheetsUpdateInput = {
    updated_at: new Date(),
  };
  if (props.body.status !== undefined) {
    updateData.status = props.body.status;
  }
  if (props.body.rejectionReason !== undefined) {
    updateData.rejection_reason = props.body.rejectionReason;
  }
  await MyGlobal.prisma.erp_hrm_timesheets.update({
    where: { id: timesheet.id },
    data: updateData,
  });
  // Fetch and return the updated timesheet
  const updatedTimesheet =
    await MyGlobal.prisma.erp_hrm_timesheets.findUniqueOrThrow({
      where: { id: timesheet.id },
      ...ErpHrmTimesheetTransformer.select(),
    });
  return await ErpHrmTimesheetTransformer.transform(updatedTimesheet);
}
