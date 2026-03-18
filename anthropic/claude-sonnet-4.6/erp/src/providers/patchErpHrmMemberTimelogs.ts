import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IErpHrmDepartment } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmDepartment";
import { IErpHrmMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmMember";
import { IErpHrmOrganizationMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmOrganizationMember";
import { IErpHrmProject } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmProject";
import { IErpHrmRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmRole";
import { IErpHrmRolePermission } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmRolePermission";
import { IErpHrmTask } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTask";
import { IErpHrmTimelog } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimelog";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageIErpHrmTimelog } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIErpHrmTimelog";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { MemberPayload } from "../decorators/payload/MemberPayload";
import { ErpHrmTimelogAtSummaryTransformer } from "../transformers/ErpHrmTimelogAtSummaryTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchErpHrmMemberTimelogs(props: {
  member: MemberPayload;
  body: IErpHrmTimelog.IRequest;
}): Promise<IPageIErpHrmTimelog.ISummary> {
  // 1. Resolve the caller's organization_member records
  const ownOrgMembers =
    await MyGlobal.prisma.erp_hrm_organization_members.findMany({
      where: {
        member_id: props.member.id,
        deleted_at: null,
      },
      select: {
        id: true,
        organization_id: true,
        role_id: true,
      },
    });
  if (ownOrgMembers.length === 0) {
    throw new HttpException("No active organization membership found", 403);
  }
  const ownOrgMemberIds = ownOrgMembers.map((m) => m.id);
  const ownOrganizationIds = ownOrgMembers.map((m) => m.organization_id);
  const ownRoleIds = ownOrgMembers.map((m) => m.role_id);
  // 2. Check if any of the caller's roles has 'time:view_all'
  const viewAllPermissions =
    await MyGlobal.prisma.erp_hrm_role_permissions.findMany({
      where: {
        role_id: { in: ownRoleIds },
        permission_code: "time:view_all",
      },
      select: { role_id: true },
    });
  const hasViewAll = viewAllPermissions.length > 0;
  // 3. Validate projectId if provided — must belong to the member's organization
  if (props.body.projectId != null) {
    const project = await MyGlobal.prisma.erp_hrm_projects.findFirst({
      where: {
        id: props.body.projectId,
        organization_id: { in: ownOrganizationIds },
        deleted_at: null,
      },
      select: { id: true },
    });
    if (project === null) {
      throw new HttpException("Project not found in organization", 404);
    }
  }
  // 4. Validate taskId belongs to projectId if both provided
  if (props.body.taskId != null && props.body.projectId != null) {
    const task = await MyGlobal.prisma.erp_hrm_tasks.findFirst({
      where: {
        id: props.body.taskId,
        erp_hrm_project_id: props.body.projectId,
        deleted_at: null,
      },
      select: { id: true },
    });
    if (task === null) {
      throw new HttpException(
        "Task does not belong to the specified project",
        400,
      );
    }
  }
  // 5. Build access-scoped WHERE clause
  const page = props.body.page ?? 1;
  const limit = props.body.limit ?? 20;
  const skip = (page - 1) * limit;
  // Merge date range into single work_date object to avoid key overwrite
  const workDateFilter =
    props.body.startDate != null || props.body.endDate != null
      ? {
          work_date: {
            ...(props.body.startDate != null && { gte: props.body.startDate }),
            ...(props.body.endDate != null && { lte: props.body.endDate }),
          },
        }
      : {};
  const accessScopeFilter: Prisma.erp_hrm_timelogsWhereInput = hasViewAll
    ? {
        organizationMember: {
          organization_id: { in: ownOrganizationIds },
        },
        ...(props.body.memberOrganizationMemberId != null && {
          organization_member_id: props.body.memberOrganizationMemberId,
        }),
      }
    : {
        organization_member_id: { in: ownOrgMemberIds },
      };
  const whereInput = {
    ...accessScopeFilter,
    ...workDateFilter,
    ...(props.body.projectId != null && { project_id: props.body.projectId }),
    ...(props.body.taskId != null && { task_id: props.body.taskId }),
    ...(props.body.billable != null && { billable: props.body.billable }),
  } satisfies Prisma.erp_hrm_timelogsWhereInput;
  // 6. Execute paginated query
  const data = await MyGlobal.prisma.erp_hrm_timelogs.findMany({
    where: whereInput,
    skip,
    take: limit,
    orderBy: [{ work_date: "desc" }, { created_at: "desc" }],
    ...ErpHrmTimelogAtSummaryTransformer.select(),
  });
  const total = await MyGlobal.prisma.erp_hrm_timelogs.count({
    where: whereInput,
  });
  return {
    data: await ArrayUtil.asyncMap(
      data,
      ErpHrmTimelogAtSummaryTransformer.transform,
    ),
    pagination: {
      current: page,
      limit: limit,
      records: total,
      pages: limit > 0 ? Math.ceil(total / limit) : 0,
    } satisfies IPage.IPagination,
  };
}
