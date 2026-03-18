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
import { ErpHrmTimelogTransformer } from "../transformers/ErpHrmTimelogTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function putErpHrmMemberTimelogsTimelogId(props: {
  member: MemberPayload;
  timelogId: string & tags.Format<"uuid">;
  body: IErpHrmTimelog.IUpdate;
}): Promise<IErpHrmTimelog> {
  // Step 1: Fetch existing timelog with auth/lock check fields
  const existing = await MyGlobal.prisma.erp_hrm_timelogs.findUniqueOrThrow({
    where: { id: props.timelogId },
    select: {
      id: true,
      project_id: true,
      task_id: true,
      organization_member_id: true,
      organizationMember: {
        select: {
          member_id: true,
          organization_id: true,
        },
      },
      timesheet: {
        select: {
          status: true,
        },
      },
    },
  });
  // Step 2: Ownership check — the logged-in member must own this timelog
  if (existing.organizationMember.member_id !== props.member.id) {
    throw new HttpException("Forbidden", 403);
  }
  // Step 3: Approved-timesheet lock — reject if timesheet is approved
  if (
    existing.timesheet !== null &&
    existing.timesheet !== undefined &&
    existing.timesheet.status === "approved"
  ) {
    throw new HttpException(
      "Timelog is locked because its timesheet has been approved",
      409,
    );
  }
  // Step 4: Determine effective project_id (from body or existing)
  const effectiveProjectId: string =
    props.body.project_id !== undefined
      ? props.body.project_id
      : existing.project_id;
  // Step 5: Project validation (only if project_id is being changed)
  if (props.body.project_id !== undefined) {
    const project = await MyGlobal.prisma.erp_hrm_projects.findUniqueOrThrow({
      where: { id: props.body.project_id },
      select: {
        organization_id: true,
        status: true,
      },
    });
    if (
      project.organization_id !== existing.organizationMember.organization_id
    ) {
      throw new HttpException(
        "Project does not belong to the member's organization",
        422,
      );
    }
    if (project.status !== "active") {
      throw new HttpException(
        "Project is not active; only active projects may receive time entries",
        422,
      );
    }
  }
  // Step 6: Project membership check — member must be a member of the effective project
  const projectMembership =
    await MyGlobal.prisma.erp_hrm_project_members.findFirst({
      where: {
        project_id: effectiveProjectId,
        organization_member_id: existing.organization_member_id,
      },
      select: { id: true },
    });
  if (projectMembership === null) {
    throw new HttpException(
      "Member is not a project member of the specified project",
      422,
    );
  }
  // Step 7: Task validation (if task_id is explicitly provided as non-null)
  if (props.body.task_id !== undefined && props.body.task_id !== null) {
    const task = await MyGlobal.prisma.erp_hrm_tasks.findUniqueOrThrow({
      where: { id: props.body.task_id },
      select: { erp_hrm_project_id: true },
    });
    if (task.erp_hrm_project_id !== effectiveProjectId) {
      throw new HttpException(
        "Task does not belong to the specified project",
        422,
      );
    }
  }
  // Step 8: Apply update — only include explicitly provided fields
  await MyGlobal.prisma.erp_hrm_timelogs.update({
    where: { id: props.timelogId },
    data: {
      ...(props.body.project_id !== undefined && {
        project_id: props.body.project_id,
      }),
      ...(props.body.task_id !== undefined && {
        task_id: props.body.task_id,
      }),
      ...(props.body.work_date !== undefined && {
        work_date: new Date(props.body.work_date),
      }),
      ...(props.body.duration_minutes !== undefined && {
        duration_minutes: props.body.duration_minutes,
      }),
      ...(props.body.billable !== undefined && {
        billable: props.body.billable,
      }),
      ...(props.body.description !== undefined && {
        description: props.body.description,
      }),
      updated_at: new Date(),
    },
  });
  // Step 9: Re-fetch with full transformer select and return transformed result
  const updated = await MyGlobal.prisma.erp_hrm_timelogs.findUniqueOrThrow({
    where: { id: props.timelogId },
    ...ErpHrmTimelogTransformer.select(),
  });
  return ErpHrmTimelogTransformer.transform(updated);
}
