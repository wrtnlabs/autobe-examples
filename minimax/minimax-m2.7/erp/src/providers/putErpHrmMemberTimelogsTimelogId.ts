import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IErpHrmDepartment } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmDepartment";
import { IErpHrmEmployee } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmEmployee";
import { IErpHrmMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmMember";
import { IErpHrmOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmOrganization";
import { IErpHrmProjectMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmProjectMember";
import { IErpHrmRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmRole";
import { IErpHrmTask } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTask";
import { IErpHrmTimelog } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimelog";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { MemberPayload } from "../decorators/payload/MemberPayload";
import { ErpHrmTimelogTransformer } from "../transformers/ErpHrmTimelogTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function putErpHrmMemberTimelogsTimelogId(props: {
  member: MemberPayload;
  timelogId: string & tags.Format<"uuid">;
  body: IErpHrmTimelog.IUpdate;
}): Promise<IErpHrmTimelog> {
  // Fetch existing timelog with ownership info and timesheet associations
  const timelog = await MyGlobal.prisma.erp_hrm_timelogs.findUniqueOrThrow({
    where: { id: props.timelogId },
    select: {
      id: true,
      erp_hrm_employee_id: true,
      erp_hrm_project_id: true,
      timelogTimesheets: {
        select: { erp_hrm_timesheet_id: true },
      },
    },
  });
  // Ownership validation: only the employee who created the timelog can update it
  if (timelog.erp_hrm_employee_id !== props.member.id) {
    throw new HttpException("Forbidden", 403);
  }
  // Check if timelog is part of submitted or approved timesheet (locking constraint)
  if (timelog.timelogTimesheets.length > 0) {
    const timesheetIds = timelog.timelogTimesheets.map(
      (t) => t.erp_hrm_timesheet_id,
    );
    const timesheets = await MyGlobal.prisma.erp_hrm_timesheets.findMany({
      where: { id: { in: timesheetIds } },
      select: { status: true },
    });
    const isLocked = timesheets.some(
      (ts) => ts.status === "submitted" || ts.status === "approved",
    );
    if (isLocked) {
      throw new HttpException(
        "Cannot update timelog in submitted or approved timesheet",
        403,
      );
    }
  }
  // Validate project membership when changing project
  if (
    props.body.project_id !== undefined &&
    props.body.project_id !== timelog.erp_hrm_project_id
  ) {
    const membership = await MyGlobal.prisma.erp_hrm_project_members.findFirst({
      where: {
        erp_hrm_employee_id: props.member.id,
        erp_hrm_project_id: props.body.project_id,
      },
    });
    if (!membership) {
      throw new HttpException("You are not a member of this project", 400);
    }
  }
  // Validate task belongs to the target project
  if (props.body.task_id !== undefined && props.body.task_id !== null) {
    const projectId = props.body.project_id ?? timelog.erp_hrm_project_id;
    const task = await MyGlobal.prisma.erp_hrm_tasks.findFirst({
      where: {
        id: props.body.task_id,
        erp_hrm_project_id: projectId,
      },
    });
    if (!task) {
      throw new HttpException(
        "Task does not belong to the specified project",
        400,
      );
    }
  }
  // Build partial update data from provided body fields
  const updateData: Prisma.erp_hrm_timelogsUpdateInput = {
    updated_at: new Date(),
  };
  if (props.body.project_id !== undefined) {
    updateData.project = {
      connect: { id: props.body.project_id },
    };
  }
  if (props.body.task_id !== undefined) {
    if (props.body.task_id === null) {
      updateData.task = { disconnect: true };
    } else {
      updateData.task = {
        connect: { id: props.body.task_id },
      };
    }
  }
  if (props.body.date !== undefined) {
    updateData.date = new Date(props.body.date);
  }
  if (props.body.duration_minutes !== undefined) {
    updateData.duration_minutes = props.body.duration_minutes;
  }
  if (props.body.description !== undefined) {
    updateData.description = props.body.description;
  }
  if (props.body.billable !== undefined) {
    updateData.billable = props.body.billable;
  }
  // Execute update
  await MyGlobal.prisma.erp_hrm_timelogs.update({
    where: { id: props.timelogId },
    data: updateData,
  });
  // Fetch updated record with full relations for response
  const updated = await MyGlobal.prisma.erp_hrm_timelogs.findUniqueOrThrow({
    where: { id: props.timelogId },
    ...ErpHrmTimelogTransformer.select(),
  });
  return await ErpHrmTimelogTransformer.transform(updated);
}
