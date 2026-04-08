import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IHrmTimeTrackDepartment } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackDepartment";
import { IHrmTimeTrackEmployee } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackEmployee";
import { IHrmTimeTrackMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackMember";
import { IHrmTimeTrackOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackOrganization";
import { IHrmTimeTrackProject } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackProject";
import { IHrmTimeTrackRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackRole";
import { IHrmTimeTrackTask } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackTask";
import { IHrmTimeTrackTimelog } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackTimelog";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { MemberPayload } from "../decorators/payload/MemberPayload";
import { HrmTimeTrackTimelogTransformer } from "../transformers/HrmTimeTrackTimelogTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function putHrmTimeTrackMemberTimelogsTimelogId(props: {
  member: MemberPayload;
  timelogId: string & tags.Format<"uuid">;
  body: IHrmTimeTrackTimelog.IUpdate;
}): Promise<IHrmTimeTrackTimelog> {
  // Step 1: Find the timelog and verify it exists
  const timelog =
    await MyGlobal.prisma.hrm_time_track_timelogs.findUniqueOrThrow({
      where: { id: props.timelogId },
      select: {
        id: true,
        hrm_time_track_employee_id: true,
        hrm_time_track_organization_id: true,
        hrm_time_track_project_id: true,
        hrm_time_track_task_id: true,
      },
    });
  // Step 2: Get member's employee record in the same organization
  const memberEmployee =
    await MyGlobal.prisma.hrm_time_track_employees.findFirst({
      where: {
        hrm_time_track_member_id: props.member.id,
        hrm_time_track_organization_id: timelog.hrm_time_track_organization_id,
        deleted_at: null,
      },
      select: { id: true, hrm_time_track_role_id: true },
    });
  if (memberEmployee === null) {
    throw new HttpException("Timelog not found in your organization", 404);
  }
  // Step 3: Check if timelog is in an approved timesheet
  const timesheetTimelog =
    await MyGlobal.prisma.hrm_time_track_timesheet_timelogs.findFirst({
      where: {
        hrm_time_track_timelog_id: props.timelogId,
      },
      include: {
        timesheet: {
          select: { status: true },
        },
      },
    });
  const isInApprovedTimesheet =
    timesheetTimelog?.timesheet.status === "approved";
  // Step 4: Check if member has time management permission
  const hasTimeManagementPermission = memberEmployee.hrm_time_track_role_id
    ? (await MyGlobal.prisma.hrm_time_track_role_permissions.count({
        where: {
          hrm_time_track_role_id: memberEmployee.hrm_time_track_role_id,
          permission: "time_management",
        },
      })) > 0
    : false;
  const isOwner = timelog.hrm_time_track_employee_id === memberEmployee.id;
  // Step 5: Verify authorization
  if (isInApprovedTimesheet && !hasTimeManagementPermission) {
    throw new HttpException("Cannot modify timelog in approved timesheet", 403);
  }
  if (!isOwner && !hasTimeManagementPermission) {
    throw new HttpException("Cannot modify another employee's timelog", 403);
  }
  // Step 6: Validate new project status if project_id is being updated
  if (props.body.project_id !== undefined) {
    const newProject = await MyGlobal.prisma.hrm_time_track_projects.findUnique(
      {
        where: { id: props.body.project_id },
        select: { status: true },
      },
    );
    if (newProject === null) {
      throw new HttpException("Project not found", 404);
    }
    if (newProject.status !== "active") {
      throw new HttpException(
        "Cannot associate timelog with non-active project",
        400,
      );
    }
    // Verify task belongs to new project if task_id is also being updated
    if (props.body.task_id !== undefined && props.body.task_id !== null) {
      const newTask = await MyGlobal.prisma.hrm_time_track_tasks.findUnique({
        where: { id: props.body.task_id },
        select: { hrm_time_track_project_id: true },
      });
      if (
        newTask === null ||
        newTask.hrm_time_track_project_id !== props.body.project_id
      ) {
        throw new HttpException(
          "Task does not belong to the specified project",
          400,
        );
      }
    }
  }
  // Step 7: Validate duration is positive if being updated
  if (
    props.body.duration_seconds !== undefined &&
    props.body.duration_seconds <= 0
  ) {
    throw new HttpException("Duration must be positive", 400);
  }
  // Step 8: Build update data
  const updateData: Prisma.hrm_time_track_timelogsUpdateInput = {
    updated_at: new Date(),
    ...(props.body.date !== undefined && { date: new Date(props.body.date) }),
    ...(props.body.duration_seconds !== undefined && {
      duration_seconds: props.body.duration_seconds,
    }),
    ...(props.body.billable !== undefined && { billable: props.body.billable }),
    ...(props.body.notes !== undefined && { notes: props.body.notes }),
    ...(props.body.project_id !== undefined && {
      project: { connect: { id: props.body.project_id } },
    }),
    ...(props.body.task_id !== undefined && {
      task:
        props.body.task_id === null
          ? { disconnect: true }
          : { connect: { id: props.body.task_id } },
    }),
  };
  // Step 9: Update the timelog
  await MyGlobal.prisma.hrm_time_track_timelogs.update({
    where: { id: props.timelogId },
    data: updateData,
  });
  // Step 10: Fetch and return the updated timelog
  const updated =
    await MyGlobal.prisma.hrm_time_track_timelogs.findUniqueOrThrow({
      where: { id: props.timelogId },
      ...HrmTimeTrackTimelogTransformer.select(),
    });
  return await HrmTimeTrackTimelogTransformer.transform(updated);
}
