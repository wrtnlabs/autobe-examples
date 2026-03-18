import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IErpHrmDepartment } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmDepartment";
import { IErpHrmMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmMember";
import { IErpHrmOrganizationMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmOrganizationMember";
import { IErpHrmRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmRole";
import { IErpHrmTask } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTask";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageIErpHrmTask } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIErpHrmTask";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { MemberPayload } from "../decorators/payload/MemberPayload";
import { ErpHrmTaskAtSummaryTransformer } from "../transformers/ErpHrmTaskAtSummaryTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchErpHrmMemberProjectsProjectIdTasks(props: {
  member: MemberPayload;
  projectId: string;
  body: IErpHrmTask.IRequest;
}): Promise<IPageIErpHrmTask.ISummary> {
  // Verify member belongs to an organization and get their role
  const organizationMember =
    await MyGlobal.prisma.erp_hrm_organization_members.findFirst({
      where: {
        user_id: props.member.id,
        is_active: true,
        deleted_at: null,
      },
      select: {
        id: true,
        organization_id: true,
        role_id: true,
      },
    });
  if (organizationMember === null) {
    throw new HttpException("Member not found in any organization", 403);
  }
  // Verify project exists and belongs to member's organization
  const project = await MyGlobal.prisma.erp_hrm_projects.findFirst({
    where: {
      id: props.projectId,
      organization_id: organizationMember.organization_id,
      deleted_at: null,
    },
    select: {
      id: true,
    },
  });
  if (project === null) {
    throw new HttpException("Project not found", 404);
  }
  // Check if member has access to this project
  const projectMember = await MyGlobal.prisma.erp_hrm_project_members.findFirst(
    {
      where: {
        project_id: props.projectId,
        organization_member_id: organizationMember.id,
        deleted_at: null,
      },
      select: {
        role: true,
      },
    },
  );
  // If not a project member, check for project:manage permission
  const hasAccess =
    projectMember !== null ||
    (await (async () => {
      const permission =
        await MyGlobal.prisma.erp_hrm_role_permissions.findFirst({
          where: {
            role_id: organizationMember.role_id,
            permission: "project:manage",
          },
          select: {
            id: true,
          },
        });
      return permission !== null;
    })());
  if (!hasAccess) {
    throw new HttpException("Forbidden - no access to this project", 403);
  }
  // Build where clause for filtering
  const where: Prisma.erp_hrm_tasksWhereInput = {
    project_id: props.projectId,
    deleted_at: null,
  };
  // Apply status filter
  if (props.body.status !== undefined && props.body.status !== null) {
    where.status = props.body.status;
  }
  // Apply priority filter
  if (props.body.priority !== undefined && props.body.priority !== null) {
    where.priority = props.body.priority;
  }
  // Apply assignedToId filter
  if (props.body.assignedToId !== undefined) {
    where.assigned_to_id = props.body.assignedToId;
  }
  // Apply parentTaskId filter
  if (props.body.parentTaskId !== undefined) {
    where.parent_task_id = props.body.parentTaskId;
  }
  // Apply due date range filters
  if (
    props.body.dueDateFrom !== undefined ||
    props.body.dueDateTo !== undefined
  ) {
    where.due_date = {};
    if (
      props.body.dueDateFrom !== undefined &&
      props.body.dueDateFrom !== null
    ) {
      where.due_date.gte = new Date(props.body.dueDateFrom);
    }
    if (props.body.dueDateTo !== undefined && props.body.dueDateTo !== null) {
      where.due_date.lte = new Date(props.body.dueDateTo);
    }
  }
  // Apply created_at range filters
  if (
    props.body.createdAtFrom !== undefined ||
    props.body.createdAtTo !== undefined
  ) {
    where.created_at = {};
    if (
      props.body.createdAtFrom !== undefined &&
      props.body.createdAtFrom !== null
    ) {
      where.created_at.gte = new Date(props.body.createdAtFrom);
    }
    if (
      props.body.createdAtTo !== undefined &&
      props.body.createdAtTo !== null
    ) {
      where.created_at.lte = new Date(props.body.createdAtTo);
    }
  }
  // Apply estimated hours range filters
  if (
    props.body.estimatedHoursMin !== undefined ||
    props.body.estimatedHoursMax !== undefined
  ) {
    where.estimated_hours = {};
    if (
      props.body.estimatedHoursMin !== undefined &&
      props.body.estimatedHoursMin !== null
    ) {
      where.estimated_hours.gte = props.body.estimatedHoursMin;
    }
    if (
      props.body.estimatedHoursMax !== undefined &&
      props.body.estimatedHoursMax !== null
    ) {
      where.estimated_hours.lte = props.body.estimatedHoursMax;
    }
  }
  // Apply search filter (title OR description)
  if (
    props.body.search !== undefined &&
    props.body.search !== null &&
    props.body.search.length > 0
  ) {
    where.OR = [
      {
        title: {
          contains: props.body.search,
          mode: "insensitive",
        },
      },
      {
        description: {
          contains: props.body.search,
          mode: "insensitive",
        },
      },
    ];
  }
  // Calculate pagination
  const page = props.body.page ?? 1;
  const limit = props.body.limit ?? 100;
  const skip = (page - 1) * limit;
  // Execute queries
  const tasks = await MyGlobal.prisma.erp_hrm_tasks.findMany({
    where,
    skip,
    take: limit,
    orderBy: {
      created_at: "desc",
    },
    ...ErpHrmTaskAtSummaryTransformer.select(),
  });
  const total = await MyGlobal.prisma.erp_hrm_tasks.count({
    where,
  });
  // Transform results
  const transformedTasks = await ArrayUtil.asyncMap(
    tasks,
    ErpHrmTaskAtSummaryTransformer.transform,
  );
  return {
    data: transformedTasks,
    pagination: {
      current: page,
      limit: limit,
      records: total,
      pages: Math.ceil(total / limit),
    },
  };
}
