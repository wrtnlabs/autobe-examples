import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IErpHrmTimeDepartment } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimeDepartment";
import { IErpHrmTimeEmployeeDashboardSummary } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimeEmployeeDashboardSummary";
import { IErpHrmTimeMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimeMember";
import { IErpHrmTimeOrganizationDashboardSummary } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimeOrganizationDashboardSummary";
import { IErpHrmTimeProject } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimeProject";
import { IErpHrmTimeRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimeRole";
import { IErpHrmTimeTaskHistoryEntry } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimeTaskHistoryEntry";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { MemberPayload } from "../decorators/payload/MemberPayload";
import { ErpHrmTimeTaskHistoryEntryTransformer } from "../transformers/ErpHrmTimeTaskHistoryEntryTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function postErpHrmTimeMemberProjectsProjectIdTasks(props: {
  member: MemberPayload;
  projectId: string & tags.Format<"uuid">;
  body: IErpHrmTimeTaskHistoryEntry.ICreate;
}): Promise<IErpHrmTimeTaskHistoryEntry> {
  const project = await MyGlobal.prisma.erp_hrm_time_projects.findUniqueOrThrow(
    {
      where: {
        id: props.projectId,
      },
      select: {
        id: true,
        erp_hrm_time_organization_id: true,
      },
    },
  );
  const membership =
    await MyGlobal.prisma.erp_hrm_time_organization_memberships.findFirst({
      where: {
        erp_hrm_time_organization_id: project.erp_hrm_time_organization_id,
        erp_hrm_time_member_id: props.member.id,
        deleted_at: null,
      },
      select: {
        id: true,
      },
    });
  if (membership === null) {
    throw new HttpException("Forbidden", 403);
  }
  if (props.body.employeeId !== undefined && props.body.employeeId !== null) {
    const assignee =
      await MyGlobal.prisma.erp_hrm_time_project_memberships.findFirst({
        where: {
          erp_hrm_time_project_id: props.projectId,
          erp_hrm_time_employee_id: props.body.employeeId,
        },
        select: {
          id: true,
        },
      });
    if (assignee === null) {
      throw new HttpException(
        "Assigned employee must be a member of the same project",
        400,
      );
    }
  }
  if (
    props.body.parentTaskId !== undefined &&
    props.body.parentTaskId !== null
  ) {
    const parentTask =
      await MyGlobal.prisma.erp_hrm_time_tasks.findUniqueOrThrow({
        where: {
          id: props.body.parentTaskId,
        },
        select: {
          id: true,
          erp_hrm_time_project_id: true,
          parent_task_id: true,
        },
      });
    if (parentTask.erp_hrm_time_project_id !== props.projectId) {
      throw new HttpException(
        "Parent task must belong to the same project",
        400,
      );
    }
    if (parentTask.parent_task_id !== null) {
      throw new HttpException("Task nesting can only be one level deep", 400);
    }
  }
  const created = await MyGlobal.prisma.erp_hrm_time_tasks.create({
    data: {
      id: v4(),
      erp_hrm_time_project_id: props.projectId,
      erp_hrm_time_employee_id:
        props.body.employeeId === undefined ? null : props.body.employeeId,
      parent_task_id:
        props.body.parentTaskId === undefined ? null : props.body.parentTaskId,
      title: props.body.title,
      description:
        props.body.description === undefined ? null : props.body.description,
      status: props.body.status === undefined ? "open" : props.body.status,
      priority: props.body.priority,
      estimated_hours:
        props.body.estimatedHours === undefined
          ? null
          : props.body.estimatedHours,
      due_date:
        props.body.dueDate === undefined || props.body.dueDate === null
          ? null
          : toISOStringSafe(props.body.dueDate),
      created_at: new Date(),
      updated_at: new Date(),
      deleted_at: null,
    },
    ...ErpHrmTimeTaskHistoryEntryTransformer.select(),
  });
  return await ErpHrmTimeTaskHistoryEntryTransformer.transform(created);
}
