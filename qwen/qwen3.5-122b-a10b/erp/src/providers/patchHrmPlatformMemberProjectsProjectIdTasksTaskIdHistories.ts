import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IHrmPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformMember";
import { IHrmPlatformTaskHistory } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformTaskHistory";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageIHrmPlatformTaskHistory } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIHrmPlatformTaskHistory";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { MemberPayload } from "../decorators/payload/MemberPayload";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchHrmPlatformMemberProjectsProjectIdTasksTaskIdHistories(props: {
  member: MemberPayload;
  projectId: string & tags.Format<"uuid">;
  taskId: string & tags.Format<"uuid">;
  body: IHrmPlatformTaskHistory.IRequest;
}): Promise<IPageIHrmPlatformTaskHistory.ISummary> {
  // Validate project exists
  const project = await MyGlobal.prisma.hrm_platform_projects.findUnique({
    where: { id: props.projectId },
  });
  if (project === null) {
    throw new HttpException("Project not found", 404);
  }
  // Validate task exists and belongs to project
  const task = await MyGlobal.prisma.hrm_platform_tasks.findUnique({
    where: { id: props.taskId },
  });
  if (task === null || task.hrm_platform_projects_id !== props.projectId) {
    throw new HttpException("Task not found", 404);
  }
  // Get employee IDs for this member
  const employees = await MyGlobal.prisma.hrm_platform_employees.findMany({
    where: { hrm_platform_user_id: props.member.id, deleted_at: null },
    select: { id: true },
  });
  const employeeIds = employees.map((e) => e.id);
  // Check project membership
  if (employeeIds.length === 0) {
    throw new HttpException("Forbidden", 403);
  }
  const membership =
    await MyGlobal.prisma.hrm_platform_project_members.findFirst({
      where: {
        hrm_platform_project_id: props.projectId,
        hrm_platform_employee_id: {
          in: employeeIds,
        },
        deleted_at: null,
      },
    });
  if (membership === null) {
    throw new HttpException("Forbidden", 403);
  }
  // Build where clause
  const whereInput: Prisma.hrm_platform_task_historiesWhereInput = {
    hrm_platform_task_id: props.taskId,
    deleted_at: null,
  };
  if (
    props.body.changed_at_from !== undefined ||
    props.body.changed_at_to !== undefined
  ) {
    whereInput.changed_at = {};
    if (props.body.changed_at_from !== undefined) {
      whereInput.changed_at.gte = new Date(props.body.changed_at_from);
    }
    if (props.body.changed_at_to !== undefined) {
      whereInput.changed_at.lte = new Date(props.body.changed_at_to);
    }
  }
  if (props.body.hrm_platform_member_id !== undefined) {
    whereInput.hrm_platform_member_id = props.body.hrm_platform_member_id;
  }
  // Build orderBy clause
  const sortField = props.body.sort_by ?? "changed_at";
  const sortOrder = props.body.order ?? "desc";
  const orderByInput: Prisma.hrm_platform_task_historiesOrderByWithRelationInput =
    {
      [sortField]: sortOrder,
    };
  // Pagination
  const page = props.body.page ?? 1;
  const limit = props.body.limit ?? 100;
  const skip = (page - 1) * limit;
  // Fetch records
  const records = await MyGlobal.prisma.hrm_platform_task_histories.findMany({
    where: whereInput,
    orderBy: orderByInput,
    skip,
    take: limit,
    select: {
      id: true,
      hrm_platform_task_id: true,
      hrm_platform_member_id: true,
      changed_at: true,
      old_status: true,
      new_status: true,
      member: {
        select: {
          id: true,
          email: true,
          display_name: true,
          avatar_image: true,
          phone_number: true,
        },
      },
    },
  });
  // Count total
  const total = await MyGlobal.prisma.hrm_platform_task_histories.count({
    where: whereInput,
  });
  // Transform results
  const data = await ArrayUtil.asyncMap(records, async (record) => {
    const result: IHrmPlatformTaskHistory.ISummary = {
      id: record.id,
      changed_at: toISOStringSafe(record.changed_at) as string &
        tags.Format<"date-time">,
      old_status: record.old_status,
      new_status: record.new_status,
      member: {
        id: record.member.id,
        email: record.member.email,
        display_name: record.member.display_name,
        avatar_image: record.member.avatar_image as
          | (string & tags.Format<"url">)
          | null
          | undefined,
        phone_number: record.member.phone_number ?? undefined,
      } satisfies IHrmPlatformMember.ISummary,
    } satisfies IHrmPlatformTaskHistory.ISummary;
    return result;
  });
  const response: IPageIHrmPlatformTaskHistory.ISummary = {
    pagination: {
      current: page,
      limit: limit,
      records: total,
      pages: Math.ceil(total / limit),
    } satisfies IPage.IPagination,
    data: data,
  } satisfies IPageIHrmPlatformTaskHistory.ISummary;
  return response;
}
