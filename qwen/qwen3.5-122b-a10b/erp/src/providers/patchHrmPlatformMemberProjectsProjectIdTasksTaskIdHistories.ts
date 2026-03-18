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
  // Validate pagination parameters
  const page = typia.assert<number & tags.Type<"int32"> & tags.Minimum<1>>(
    props.body.page ?? 1,
  );
  const limit = typia.assert<
    number & tags.Type<"int32"> & tags.Minimum<1> & tags.Maximum<100>
  >(props.body.limit ?? 100);
  const skip = (page - 1) * limit;
  // Verify project exists
  const project = await MyGlobal.prisma.hrm_platform_projects.findUnique({
    where: { id: props.projectId },
    select: { id: true },
  });
  if (project === null) {
    throw new HttpException("Project not found", 404);
  }
  // Verify task exists and belongs to the project
  const task = await MyGlobal.prisma.hrm_platform_tasks.findUnique({
    where: { id: props.taskId },
    select: { id: true, hrm_platform_projects_id: true },
  });
  if (task === null) {
    throw new HttpException("Task not found", 404);
  }
  if (task.hrm_platform_projects_id !== props.projectId) {
    throw new HttpException(
      "Task does not belong to the specified project",
      404,
    );
  }
  // Verify member has project membership (member or project-lead role)
  const projectMembership =
    await MyGlobal.prisma.hrm_platform_project_members.findFirst({
      where: {
        hrm_platform_project_id: props.projectId,
        employee: {
          hrm_platform_user_id: props.member.id,
        },
        deleted_at: null,
      },
      select: { role: true },
    });
  if (projectMembership === null) {
    throw new HttpException("Forbidden", 403);
  }
  // Build where condition for filtering
  const whereInput: Prisma.hrm_platform_task_historiesWhereInput = {
    hrm_platform_task_id: props.taskId,
    deleted_at: null,
    ...(props.body.changed_at_from !== undefined && {
      changed_at: {
        gte: new Date(props.body.changed_at_from),
      },
    }),
    ...(props.body.changed_at_to !== undefined && {
      changed_at: {
        lte: new Date(props.body.changed_at_to),
      },
    }),
    ...(props.body.hrm_platform_member_id !== undefined && {
      hrm_platform_member_id: props.body.hrm_platform_member_id,
    }),
  };
  // Build orderBy condition
  const sortField = props.body.sort_by ?? "changed_at";
  const orderDirection = props.body.order ?? "desc";
  const orderByInput: Prisma.hrm_platform_task_historiesOrderByWithRelationInput =
    {
      [sortField]: orderDirection,
    };
  // Fetch paginated records
  const histories = await MyGlobal.prisma.hrm_platform_task_histories.findMany({
    where: whereInput,
    orderBy: orderByInput,
    skip,
    take: limit,
    select: {
      id: true,
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
  // Fetch total count
  const total = await MyGlobal.prisma.hrm_platform_task_histories.count({
    where: whereInput,
  });
  // Transform to DTO
  const data = await ArrayUtil.asyncMap(histories, async (record) => ({
    id: record.id,
    changed_at: toISOStringSafe(record.changed_at),
    old_status: record.old_status,
    new_status: record.new_status,
    member: {
      id: record.member.id,
      email: record.member.email,
      display_name: record.member.display_name,
      avatar_image: record.member.avatar_image,
      phone_number: record.member.phone_number ?? undefined,
    },
  }));
  return {
    pagination: {
      current: page,
      limit: limit,
      records: total,
      pages: Math.ceil(total / limit),
    },
    data: data,
  };
}
