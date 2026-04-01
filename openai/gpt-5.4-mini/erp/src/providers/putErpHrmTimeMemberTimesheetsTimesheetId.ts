import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IErpHrmTimeDepartment } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimeDepartment";
import { IErpHrmTimeEmployee } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimeEmployee";
import { IErpHrmTimeMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimeMember";
import { IErpHrmTimeOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimeOrganization";
import { IErpHrmTimeProject } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimeProject";
import { IErpHrmTimeRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimeRole";
import { IErpHrmTimeTask } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimeTask";
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

export async function putErpHrmTimeMemberTimesheetsTimesheetId(props: {
  member: MemberPayload;
  timesheetId: string & tags.Format<"uuid">;
  body: IErpHrmTimeTimesheet.IUpdate;
}): Promise<IErpHrmTimeTimesheet> {
  const timesheet =
    await MyGlobal.prisma.erp_hrm_time_timesheets.findUniqueOrThrow({
      where: {
        id: props.timesheetId,
        deleted_at: null,
      },
      select: {
        id: true,
        erp_hrm_time_employee_id: true,
        reviewed_by_member_id: true,
        week_start_date: true,
        week_end_date: true,
        status: true,
        submitted_at: true,
        reviewed_at: true,
        rejection_reason: true,
        created_at: true,
        updated_at: true,
        deleted_at: true,
        employee: {
          select: {
            id: true,
            erp_hrm_time_organization_id: true,
            erp_hrm_time_member_id: true,
          },
        },
      },
    });
  const isOwner = timesheet.employee.erp_hrm_time_member_id === props.member.id;
  const canSelfEdit =
    isOwner &&
    (timesheet.status === "draft" || timesheet.status === "rejected");
  const canReview = timesheet.status === "submitted";
  const wantsTimelogEdit = props.body.timelogs !== undefined;
  const wantsApproval = props.body.approvalStatus !== undefined;
  if (wantsTimelogEdit && wantsApproval) {
    throw new HttpException(
      "Cannot mix timelog edits with approval review",
      400,
    );
  }
  if (wantsTimelogEdit) {
    if (!canSelfEdit) {
      throw new HttpException("Forbidden", 403);
    }
    const desired = props.body.timelogs?.[0]?.timelogIds ?? [];
    const included = await MyGlobal.prisma.erp_hrm_time_timelogs.findMany({
      where: {
        id: { in: desired },
        deleted_at: null,
      },
      select: {
        id: true,
        work_date: true,
        duration_minutes: true,
        erp_hrm_time_member_id: true,
        erp_hrm_time_project_id: true,
        erp_hrm_time_task_id: true,
        billable: true,
        description: true,
        created_at: true,
        updated_at: true,
        deleted_at: true,
      },
    });
    if (included.length !== desired.length) {
      throw new HttpException("Some timelogs do not exist", 400);
    }
    for (const timelog of included) {
      if (timelog.erp_hrm_time_member_id !== props.member.id) {
        throw new HttpException("Forbidden", 403);
      }
      if (
        timelog.work_date < timesheet.week_start_date ||
        timelog.work_date > timesheet.week_end_date
      ) {
        throw new HttpException("Timelog is outside the timesheet week", 400);
      }
    }
    const current =
      await MyGlobal.prisma.erp_hrm_time_timesheet_timelogs.findMany({
        where: {
          erp_hrm_time_timesheet_id: props.timesheetId,
          deleted_at: null,
        },
        select: {
          erp_hrm_time_timelog_id: true,
        },
      });
    const currentIds = current.map((item) => item.erp_hrm_time_timelog_id);
    const removeIds = currentIds.filter((id) => !desired.includes(id));
    const addIds = desired.filter((id) => !currentIds.includes(id));
    for (const timelogId of removeIds) {
      await MyGlobal.prisma.erp_hrm_time_timesheet_timelogs.deleteMany({
        where: {
          erp_hrm_time_timesheet_id: props.timesheetId,
          erp_hrm_time_timelog_id: timelogId,
        },
      });
    }
    for (const timelogId of addIds) {
      await MyGlobal.prisma.erp_hrm_time_timesheet_timelogs.create({
        data: {
          id: v4(),
          erp_hrm_time_timesheet_id: props.timesheetId,
          erp_hrm_time_timelog_id: timelogId,
          created_at: new globalThis.Date(),
          updated_at: new globalThis.Date(),
          deleted_at: null,
        },
      });
    }
    await MyGlobal.prisma.erp_hrm_time_timesheets.update({
      where: { id: props.timesheetId },
      data: {
        updated_at: new globalThis.Date(),
      },
    });
  } else if (wantsApproval) {
    if (!canReview) {
      throw new HttpException("Timesheet is not submitted", 400);
    }
    if (props.body.approvalStatus === "approved") {
      await MyGlobal.prisma.erp_hrm_time_timesheets.update({
        where: { id: props.timesheetId },
        data: {
          status: "approved",
          reviewed_by_member_id: props.member.id,
          reviewed_at: new globalThis.Date(),
          rejection_reason: null,
          updated_at: new globalThis.Date(),
        },
      });
    } else {
      const rejection = props.body.rejection;
      const rejectionReason =
        rejection === undefined || rejection === null
          ? null
          : rejection.rejectionReason;
      if (typeof rejectionReason !== "string") {
        throw new HttpException("Rejection reason is required", 400);
      }
      if (rejectionReason === "") {
        throw new HttpException("Rejection reason is required", 400);
      }
      await MyGlobal.prisma.erp_hrm_time_timesheets.update({
        where: { id: props.timesheetId },
        data: {
          status: "rejected",
          reviewed_by_member_id: props.member.id,
          reviewed_at: new globalThis.Date(),
          rejection_reason: rejectionReason,
          updated_at: new globalThis.Date(),
        },
      });
    }
  } else {
    throw new HttpException("Nothing to update", 400);
  }
  const updated =
    await MyGlobal.prisma.erp_hrm_time_timesheets.findUniqueOrThrow({
      where: { id: props.timesheetId },
      ...ErpHrmTimeTimesheetTransformer.select(),
    });
  return await ErpHrmTimeTimesheetTransformer.transform(updated);
}
