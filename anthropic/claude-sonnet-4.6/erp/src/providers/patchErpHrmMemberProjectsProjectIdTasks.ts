import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IErpHrmDepartment } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmDepartment";
import { IErpHrmMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmMember";
import { IErpHrmOrganizationMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmOrganizationMember";
import { IErpHrmRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmRole";
import { IErpHrmRolePermission } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmRolePermission";
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
  projectId: string & tags.Format<"uuid">;
  body: IErpHrmTask.IRequest;
}): Promise<IPageIErpHrmTask.ISummary> {
  // 1. Verify the project exists and is not deleted
  const project = await MyGlobal.prisma.erp_hrm_projects.findFirstOrThrow({
    where: {
      id: props.projectId,
      deleted_at: null,
    },
    select: {
      id: true,
      organization_id: true,
    },
  });
  // 2. Resolve the requester's organization member record
  const orgMember =
    await MyGlobal.prisma.erp_hrm_organization_members.findFirstOrThrow({
      where: {
        member_id: props.member.id,
        organization_id: project.organization_id,
        deleted_at: null,
      },
      select: {
        id: true,
        role_id: true,
      },
    });
  // 3. Authorization check
  // 3a. Check project:manage permission
  const managePermission =
    await MyGlobal.prisma.erp_hrm_role_permissions.findFirst({
      where: {
        role_id: orgMember.role_id,
        permission_code: "project:manage",
      },
      select: { id: true },
    });
  const hasManagePermission = managePermission !== null;
  if (!hasManagePermission) {
    // 3b. Check if requester is a project-lead
    const projectMembership =
      await MyGlobal.prisma.erp_hrm_project_members.findFirst({
        where: {
          project_id: props.projectId,
          organization_member_id: orgMember.id,
          deleted_at: null,
        },
        select: {
          id: true,
          project_role: true,
        },
      });
    if (projectMembership === null) {
      throw new HttpException("Forbidden", 403);
    }
    // Regular members and project leads are both allowed to view tasks
    // (project lead check would be needed for write ops but for listing, any member may view)
  }
  // 4. Build WHERE clause for tasks
  const validStatuses = ["open", "in-progress", "completed", "closed"];
  const validPriorities = ["low", "medium", "high", "urgent"];
  if (props.body.statuses && props.body.statuses.length > 0) {
    for (const s of props.body.statuses) {
      if (!validStatuses.includes(s)) {
        throw new HttpException(`Invalid status value: ${s}`, 400);
      }
    }
  }
  if (props.body.priorities && props.body.priorities.length > 0) {
    for (const p of props.body.priorities) {
      if (!validPriorities.includes(p)) {
        throw new HttpException(`Invalid priority value: ${p}`, 400);
      }
    }
  }
  const whereInput = {
    erp_hrm_project_id: props.projectId,
    deleted_at: null,
    ...(props.body.statuses && props.body.statuses.length > 0
      ? { status: { in: props.body.statuses } }
      : {}),
    ...(props.body.priorities && props.body.priorities.length > 0
      ? { priority: { in: props.body.priorities } }
      : {}),
    ...(props.body.assigneeId != null
      ? { erp_hrm_organization_member_id: props.body.assigneeId }
      : {}),
  } satisfies Prisma.erp_hrm_tasksWhereInput;
  // 5. Build ORDER BY clause
  const sortOrder: "asc" | "desc" =
    props.body.sortOrder === "asc" ? "asc" : "desc";
  const orderByInput = (
    props.body.sortBy === "dueDate"
      ? { due_date: sortOrder }
      : props.body.sortBy === "priority"
        ? { priority: sortOrder }
        : { created_at: sortOrder }
  ) satisfies Prisma.erp_hrm_tasksOrderByWithRelationInput;
  // 6. Pagination
  const page = props.body.page ?? 1;
  const limit = props.body.limit ?? 20;
  const skip = (page - 1) * limit;
  // 7. Query tasks
  const data = await MyGlobal.prisma.erp_hrm_tasks.findMany({
    where: whereInput,
    skip,
    take: limit,
    orderBy: orderByInput,
    ...ErpHrmTaskAtSummaryTransformer.select(),
  });
  const total = await MyGlobal.prisma.erp_hrm_tasks.count({
    where: whereInput,
  });
  // 8. Transform results
  const transformed = await ArrayUtil.asyncMap(
    data,
    ErpHrmTaskAtSummaryTransformer.transform,
  );
  return {
    pagination: {
      current: page,
      limit: limit,
      records: total,
      pages: Math.ceil(total / limit),
    } satisfies IPage.IPagination,
    data: transformed,
  };
}
