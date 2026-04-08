import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IHrmTimeTrackDepartment } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackDepartment";
import { IHrmTimeTrackEmployee } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackEmployee";
import { IHrmTimeTrackMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackMember";
import { IHrmTimeTrackOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackOrganization";
import { IHrmTimeTrackProject } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackProject";
import { IHrmTimeTrackRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackRole";
import { IHrmTimeTrackTask } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackTask";
import { IHrmTimeTrackTimer } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackTimer";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { MemberPayload } from "../decorators/payload/MemberPayload";
import { HrmTimeTrackTimerTransformer } from "../transformers/HrmTimeTrackTimerTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function putHrmTimeTrackMemberTimersTimerId(props: {
  member: MemberPayload;
  timerId: string & tags.Format<"uuid">;
  body: IHrmTimeTrackTimer.IUpdate;
}): Promise<IHrmTimeTrackTimer> {
  // Get the session to determine the organization context
  const session =
    await MyGlobal.prisma.hrm_time_track_member_sessions.findUniqueOrThrow({
      where: {
        id: props.member.session_id,
      },
      select: {
        hrm_time_track_organization_id: true,
      },
    });
  // Get the member's employee record for the current organization
  const employee = await MyGlobal.prisma.hrm_time_track_employees.findFirst({
    where: {
      hrm_time_track_member_id: props.member.id,
      hrm_time_track_organization_id: session.hrm_time_track_organization_id,
      deleted_at: null,
    },
  });
  if (employee === null) {
    throw new HttpException("Employee record not found", 404);
  }
  // Retrieve the timer and verify ownership
  const timer = await MyGlobal.prisma.hrm_time_track_timers.findUniqueOrThrow({
    where: {
      id: props.timerId,
      hrm_time_track_employee_id: employee.id,
    },
    select: {
      id: true,
      is_active: true,
      hrm_time_track_project_id: true,
    },
  });
  // Verify timer is active
  if (timer.is_active === false) {
    throw new HttpException("Timer is not active", 400);
  }
  // Determine the target project ID (new if updating, or existing)
  const targetProjectId =
    props.body.hrm_time_track_project_id ?? timer.hrm_time_track_project_id;
  // Verify employee has access to the target project
  const projectMember =
    await MyGlobal.prisma.hrm_time_track_project_members.findFirst({
      where: {
        hrm_time_track_employee_id: employee.id,
        hrm_time_track_project_id: targetProjectId,
      },
    });
  if (projectMember === null) {
    throw new HttpException(
      "You do not have access to the specified project",
      403,
    );
  }
  // If updating task, verify task belongs to the target project
  if (
    props.body.hrm_time_track_task_id !== undefined &&
    props.body.hrm_time_track_task_id !== null
  ) {
    const task = await MyGlobal.prisma.hrm_time_track_tasks.findFirst({
      where: {
        id: props.body.hrm_time_track_task_id,
        hrm_time_track_project_id: targetProjectId,
        deleted_at: null,
      },
    });
    if (task === null) {
      throw new HttpException(
        "Task not found or does not belong to the specified project",
        404,
      );
    }
  }
  // Build update data with conditional fields
  const updateData: Prisma.hrm_time_track_timersUpdateInput = {
    updated_at: new Date(),
  };
  if (props.body.description !== undefined) {
    updateData.description = props.body.description;
  }
  if (props.body.hrm_time_track_project_id !== undefined) {
    updateData.project = {
      connect: { id: props.body.hrm_time_track_project_id },
    };
  }
  if (props.body.hrm_time_track_task_id !== undefined) {
    if (props.body.hrm_time_track_task_id === null) {
      updateData.task = { disconnect: true };
    } else {
      updateData.task = { connect: { id: props.body.hrm_time_track_task_id } };
    }
  }
  // Update the timer
  await MyGlobal.prisma.hrm_time_track_timers.update({
    where: { id: props.timerId },
    data: updateData,
  });
  // Fetch and return the updated timer
  const updated = await MyGlobal.prisma.hrm_time_track_timers.findUniqueOrThrow(
    {
      where: { id: props.timerId },
      ...HrmTimeTrackTimerTransformer.select(),
    },
  );
  return await HrmTimeTrackTimerTransformer.transform(updated);
}
