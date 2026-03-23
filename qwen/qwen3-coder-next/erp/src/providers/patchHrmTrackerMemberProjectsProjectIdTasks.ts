import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IHrmTrackerEmployee } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTrackerEmployee";
import { IHrmTrackerMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTrackerMember";
import { IHrmTrackerTask } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTrackerTask";
import { IHrmTrackerTaskSortOption } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTrackerTaskSortOption";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageIHrmTrackerTask } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIHrmTrackerTask";
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

export async function patchHrmTrackerMemberProjectsProjectIdTasks(props: {
  member: MemberPayload;
  projectId: string;
  body: IHrmTrackerTask.IRequest;
}): Promise<IPageIHrmTrackerTask.ISummary> {
  // Verify project membership
  const projectMember =
    await MyGlobal.prisma.hrm_tracker_project_members.findFirst({
      where: {
        project: {
          id: props.projectId,
          deleted_at: null,
        },
        employee: {
          id: props.member.id,
          deleted_at: null,
        },
        deleted_at: null,
      },
      select: { id: true },
    });
  if (!projectMember) {
    throw new HttpException("Forbidden", 403);
  }
  // Parse pagination parameters
  const page = props.body.page ?? 1;
  const limit = props.body.limit ?? 20;
  const skip = (page - 1) * limit;
  // Build where clause
  const whereInput: Prisma.hrm_tracker_tasksWhereInput = {
    project_id: props.projectId,
    deleted_at: null,
    ...(props.body.status && { status: { in: [props.body.status] } }),
    ...(props.body.priority && { priority: { in: [props.body.priority] } }),
    ...(props.body.assignedEmployeeId && {
      assigned_employee_id: props.body.assignedEmployeeId,
    }),
    ...(props.body.search && {
      title: { contains: props.body.search },
      description: { contains: props.body.search },
    }),
  } satisfies Prisma.hrm_tracker_tasksWhereInput;
  // Build orderBy clause
  const orderBy: Prisma.hrm_tracker_tasksOrderByWithRelationInput[] = [];
  if (props.body.sort && props.body.sort.length > 0) {
    orderBy.push(
      ...props.body.sort.map((s) => ({
        [s.field]: s.direction,
      })),
    );
  } else {
    orderBy.push({ created_at: "desc" });
  }
  // Execute query
  const data = await MyGlobal.prisma.hrm_tracker_tasks.findMany({
    where: whereInput,
    skip,
    take: limit,
    orderBy,
    select: {
      id: true,
      title: true,
      status: true,
      priority: true,
      due_date: true,
      assignedEmployee: {
        select: {
          id: true,
          status: true,
          position: true,
          created_at: true,
          user: {
            select: {
              id: true,
              display_name: true,
              avatar_url: true,
              phone: true,
              status: true,
              email_verified: true,
            },
          },
        },
      },
    },
  });
  const total = await MyGlobal.prisma.hrm_tracker_tasks.count({
    where: whereInput,
  });
  return {
    pagination: {
      current: page,
      limit: limit,
      records: total,
      pages: Math.ceil(total / limit),
    } satisfies IPage.IPagination,
    data: data.map((task) => ({
      id: task.id as string & tags.Format<"uuid">,
      title: task.title,
      status: task.status as "open" | "in-progress" | "completed" | "closed",
      priority: task.priority as "low" | "medium" | "high" | "urgent",
      due_date: task.due_date
        ? (toISOStringSafe(task.due_date) as string & tags.Format<"date-time">)
        : null,
      assignedEmployee: task.assignedEmployee
        ? ({
            id: task.assignedEmployee.id as string & tags.Format<"uuid">,
            status: task.assignedEmployee.status as "active" | "deactivated",
            position: task.assignedEmployee.position,
            created_at: toISOStringSafe(
              task.assignedEmployee.created_at,
            ) as string & tags.Format<"date-time">,
            user: {
              id: task.assignedEmployee.user.id as string & tags.Format<"uuid">,
              display_name: task.assignedEmployee.user.display_name,
              avatar_url: task.assignedEmployee.user.avatar_url,
              phone: task.assignedEmployee.user.phone,
              status: task.assignedEmployee.user.status as
                | "active"
                | "deactivated",
              email_verified: task.assignedEmployee.user.email_verified,
            } satisfies IHrmTrackerMember.ISummary,
          } satisfies IHrmTrackerEmployee.ISummary)
        : null,
    })),
  } satisfies IPageIHrmTrackerTask.ISummary;
}
