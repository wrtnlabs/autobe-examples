import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IHrmsTask } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmsTask";
import { IHrmsTaskAnalyticGrouping } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmsTaskAnalyticGrouping";
import { IHrmsTaskParentTaskFilter } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmsTaskParentTaskFilter";
import { IHrmsTaskPriority } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmsTaskPriority";
import { IHrmsTaskStatusHistory } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmsTaskStatusHistory";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageIHrmsTask } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIHrmsTask";
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

export async function patchHrmsMemberTasks(props: {
  member: MemberPayload;
  body: IHrmsTask.IRequest;
}): Promise<IPageIHrmsTask.ISummary> {
  // 1. Get member's organization membership
  const membership = await MyGlobal.prisma.hrms_organization_members.findFirst({
    where: {
      hrms_member_id: props.member.id,
      deleted_at: null,
    },
  });
  if (membership === null) {
    throw new HttpException("No organization membership found", 404);
  }
  const organizationId = membership.hrms_organization_id;
  // Get the employee record associated with this membership
  const employee = await MyGlobal.prisma.hrms_employees.findFirst({
    where: {
      organization_member_id: membership.id,
      deleted_at: null,
    },
  });
  if (employee === null) {
    throw new HttpException("No employee record found", 404);
  }
  // 2. Build filter conditions
  const statusFilter =
    props.body.status && props.body.status.length > 0
      ? { status: { in: props.body.status } }
      : {};
  const priorityFilter =
    props.body.priority && props.body.priority.length > 0
      ? { priority: { in: props.body.priority } }
      : {};
  const projectIdsFilter =
    props.body.projectIds && props.body.projectIds.length > 0
      ? { hrms_project_id: { in: props.body.projectIds } }
      : {};
  const employeeIdsFilter =
    props.body.employeeIds && props.body.employeeIds.length > 0
      ? { hrms_employee_id: { in: props.body.employeeIds } }
      : {};
  const withAssignmentFilter =
    props.body.withAssignment === true
      ? { hrms_employee_id: { not: null } }
      : props.body.withAssignment === false
        ? { hrms_employee_id: null }
        : {};
  const parentTaskFilter = props.body.parentTaskFilter;
  const parentTaskCondition =
    parentTaskFilter === "parent"
      ? { hrms_task_id: null }
      : parentTaskFilter === "subtask"
        ? { hrms_task_id: { not: null } }
        : {};
  const createdDateFromFilter = props.body.createdDateFrom
    ? {
        created_at: {
          gte: props.body.createdDateFrom as string & tags.Format<"date-time">,
        },
      }
    : {};
  const createdDateToFilter = props.body.createdDateTo
    ? {
        created_at: {
          lte: props.body.createdDateTo as string & tags.Format<"date-time">,
        },
      }
    : {};
  const dueDateFromFilter = props.body.dueDateFrom
    ? {
        due_date: {
          gte: props.body.dueDateFrom as string & tags.Format<"date-time">,
        },
      }
    : {};
  const dueDateToFilter = props.body.dueDateTo
    ? {
        due_date: {
          lte: props.body.dueDateTo as string & tags.Format<"date-time">,
        },
      }
    : {};
  // 3. Get all projects the employee is a member of
  const memberProjectMembers =
    await MyGlobal.prisma.hrms_project_members.findMany({
      where: {
        employee_id: employee.id,
        deleted_at: null,
      },
      select: { project_id: true },
    });
  const visibleProjectIds = memberProjectMembers.map((p) => p.project_id);
  // 4. Build WHERE clause
  const whereInput: Prisma.hrms_tasksWhereInput = {
    deleted_at: null,
    ...statusFilter,
    ...priorityFilter,
    ...projectIdsFilter,
    ...employeeIdsFilter,
    ...withAssignmentFilter,
    ...parentTaskCondition,
    ...createdDateFromFilter,
    ...createdDateToFilter,
    ...dueDateFromFilter,
    ...dueDateToFilter,
    OR: [
      ...visibleProjectIds.map((projectId) => ({ hrms_project_id: projectId })),
      { hrms_employee_id: employee.id },
    ],
  };
  // 5. Get total count
  const total = await MyGlobal.prisma.hrms_tasks.count({
    where: whereInput,
  });
  // 6. Pagination
  const page = props.body.page ?? 1;
  const limit = Math.min(props.body.limit ?? 20, 100);
  const skip = (page - 1) * limit;
  // 7. Fetch tasks with project and employee relations
  const tasks = await MyGlobal.prisma.hrms_tasks.findMany({
    where: whereInput,
    skip,
    take: limit,
    orderBy: { created_at: "desc" },
    include: {
      project: {
        select: {
          id: true,
          name: true,
        },
      },
      assignedEmployee: {
        select: {
          id: true,
          display_name: true,
        },
      },
    },
  });
  // 8. Transform to response DTO
  const data = await ArrayUtil.asyncMap(tasks, async (task) => {
    return {
      project_id: task.hrms_project_id as string & tags.Format<"uuid">,
      project_name: task.project.name,
      task_count: 0,
    } satisfies IHrmsTask.ISummary;
  });
  return {
    data,
    pagination: {
      current: page,
      limit,
      records: total,
      pages: Math.ceil(total / limit),
    } satisfies IPage.IPagination,
  };
}
