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
import { ErpHrmTimelogTransformer } from "../transformers/ErpHrmTimelogTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function putErpHrmMemberTimelogsTimelogId(props: {
  member: MemberPayload;
  timelogId: string;
  body: IErpHrmTimelog.IUpdate;
}): Promise<IErpHrmTimelog> {
  // Step 1: Fetch timelog with organization context
  const timelog = await MyGlobal.prisma.erp_hrm_timelogs.findUniqueOrThrow({
    where: { id: props.timelogId },
    select: {
      id: true,
      organization_member_id: true,
      project_id: true,
      task_id: true,
      timesheet_id: true,
      start_time: true,
      end_time: true,
      duration_minutes: true,
      billable: true,
      description: true,
      organizationMember: {
        select: {
          organization_id: true,
          user_id: true,
        },
      },
    },
  });
  // Step 2: Get requester's organization member and permissions
  const requesterOrgMember =
    await MyGlobal.prisma.erp_hrm_organization_members.findFirst({
      where: {
        user_id: props.member.id,
        organization_id: timelog.organizationMember.organization_id,
        deleted_at: null,
      },
      select: {
        id: true,
        role: {
          select: {
            rolePermissions: {
              select: {
                permission: true,
              },
            },
          },
        },
      },
    });
  if (!requesterOrgMember) {
    throw new HttpException("Forbidden", 403);
  }
  const hasTimeManagePermission =
    requesterOrgMember.role?.rolePermissions?.some(
      (rp: { permission: string }) => rp.permission === "time:manage",
    ) ?? false;
  // Authorization: Must be owner or have time:manage permission
  if (
    timelog.organization_member_id !== requesterOrgMember.id &&
    !hasTimeManagePermission
  ) {
    throw new HttpException("Forbidden", 403);
  }
  // Step 3: Timesheet lock check
  if (timelog.timesheet_id) {
    const timesheet = await MyGlobal.prisma.erp_hrm_timesheets.findUnique({
      where: { id: timelog.timesheet_id },
      select: { status: true },
    });
    if (
      timesheet &&
      (timesheet.status === "submitted" || timesheet.status === "approved") &&
      !hasTimeManagePermission
    ) {
      throw new HttpException("Timesheet is locked", 403);
    }
  }
  // Step 4: Project assignment validation (if projectId changed)
  const targetProjectId = props.body.projectId ?? timelog.project_id;
  if (props.body.projectId && props.body.projectId !== timelog.project_id) {
    const projectMembership =
      await MyGlobal.prisma.erp_hrm_project_members.findFirst({
        where: {
          project_id: props.body.projectId,
          organization_member_id: requesterOrgMember.id,
          deleted_at: null,
        },
      });
    if (!projectMembership) {
      throw new HttpException("Not a member of the target project", 400);
    }
  }
  // Step 5: Task validation (if taskId provided)
  if (props.body.taskId !== undefined && props.body.taskId !== null) {
    const task = await MyGlobal.prisma.erp_hrm_tasks.findFirst({
      where: {
        id: props.body.taskId,
        project_id: targetProjectId,
        deleted_at: null,
      },
    });
    if (!task) {
      throw new HttpException("Task not found in project", 400);
    }
  }
  // Step 6: Duration calculation
  const effectiveStartTime =
    props.body.startTime ?? toISOStringSafe(timelog.start_time);
  const effectiveEndTime =
    props.body.endTime ?? toISOStringSafe(timelog.end_time);
  const durationMs =
    new Date(effectiveEndTime).getTime() -
    new Date(effectiveStartTime).getTime();
  const durationMinutes = Math.round(durationMs / (1000 * 60));
  if (durationMinutes <= 0) {
    throw new HttpException("Invalid duration", 400);
  }
  // Step 7: Determine organization_member_id (permission-based)
  const updateOrgMemberId =
    hasTimeManagePermission && props.body.organizationMemberId !== undefined
      ? props.body.organizationMemberId
      : timelog.organization_member_id;
  // Step 8: Update timelog
  await MyGlobal.prisma.erp_hrm_timelogs.update({
    where: { id: props.timelogId },
    data: {
      ...(props.body.projectId !== undefined && {
        project_id: props.body.projectId,
      }),
      ...(props.body.taskId !== undefined && { task_id: props.body.taskId }),
      ...(props.body.startTime !== undefined && {
        start_time: props.body.startTime,
      }),
      ...(props.body.endTime !== undefined && { end_time: props.body.endTime }),
      ...(props.body.billable !== undefined && {
        billable: props.body.billable,
      }),
      ...(props.body.description !== undefined && {
        description: props.body.description,
      }),
      organization_member_id: updateOrgMemberId ?? undefined,
      duration_minutes: durationMinutes,
      updated_at: new Date(),
    },
  });
  // Fetch the updated record with relations for transformation
  const updated = await MyGlobal.prisma.erp_hrm_timelogs.findUniqueOrThrow({
    where: { id: props.timelogId },
    ...ErpHrmTimelogTransformer.select(),
  });
  return await ErpHrmTimelogTransformer.transform(updated);
}
