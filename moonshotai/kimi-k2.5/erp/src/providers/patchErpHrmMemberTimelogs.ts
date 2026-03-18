import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IErpHrmDepartment } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmDepartment";
import { IErpHrmMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmMember";
import { IErpHrmOrganizationMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmOrganizationMember";
import { IErpHrmProject } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmProject";
import { IErpHrmRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmRole";
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
  // Get organization member record with role permissions
  const organizationMember =
    await MyGlobal.prisma.erp_hrm_organization_members.findFirstOrThrow({
      where: {
        user_id: props.member.id,
        deleted_at: null,
      },
      select: {
        id: true,
        organization_id: true,
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
  const organizationMemberId = organizationMember.id;
  const organizationId = organizationMember.organization_id;
  // Check if user has view-all-time permission
  const rolePermissions = organizationMember.role?.rolePermissions ?? [];
  const canViewAllTime = rolePermissions.some(
    (rp) => rp.permission === "time:view-all",
  );
  // Build where clause with organization isolation and permission scope
  const whereInput: Prisma.erp_hrm_timelogsWhereInput = {
    deleted_at: null,
    organizationMember: {
      organization_id: organizationId,
    },
  };
  // Apply permission-based filtering - restrict to own timelogs if no view-all permission
  if (!canViewAllTime) {
    whereInput.organization_member_id = organizationMemberId;
  }
  // Apply date range filters
  if (
    props.body.startDateFrom !== undefined ||
    props.body.startDateTo !== undefined
  ) {
    const startTimeFilter: {
      gte?: Date;
      lte?: Date;
    } = {};
    if (props.body.startDateFrom !== undefined) {
      startTimeFilter.gte = new Date(props.body.startDateFrom);
    }
    if (props.body.startDateTo !== undefined) {
      startTimeFilter.lte = new Date(props.body.startDateTo);
    }
    whereInput.start_time = startTimeFilter;
  }
  // Apply project filter
  if (props.body.projectId !== undefined) {
    whereInput.project_id = props.body.projectId;
  }
  // Apply task filter (including null for unassigned)
  if (props.body.taskId !== undefined) {
    whereInput.task_id = props.body.taskId;
  }
  // Apply billable filter
  if (props.body.billable !== undefined) {
    whereInput.billable = props.body.billable;
  }
  // Apply search filter on description
  if (props.body.search !== undefined && props.body.search.length > 0) {
    whereInput.description = {
      contains: props.body.search,
      mode: "insensitive",
    };
  }
  // Pagination parameters
  const page = props.body.page ?? 1;
  const limit = props.body.limit ?? 20;
  const skip = (page - 1) * limit;
  // Sorting configuration
  const sortBy = props.body.sortBy ?? "start_time";
  const sortDirection = props.body.sortDirection ?? "desc";
  // Handle project_name sorting specially (requires nested orderBy)
  let orderBy: Prisma.erp_hrm_timelogsOrderByWithRelationInput;
  if (sortBy === "project_name") {
    orderBy = {
      project: {
        name: sortDirection,
      },
    };
  } else {
    orderBy = { [sortBy]: sortDirection };
  }
  // Execute paginated query with transformer selection
  const data = await MyGlobal.prisma.erp_hrm_timelogs.findMany({
    where: whereInput,
    skip,
    take: limit,
    orderBy,
    ...ErpHrmTimelogAtSummaryTransformer.select(),
  });
  // Get total count for pagination metadata
  const total = await MyGlobal.prisma.erp_hrm_timelogs.count({
    where: whereInput,
  });
  // Transform and return paginated response
  return {
    data: await ArrayUtil.asyncMap(
      data,
      ErpHrmTimelogAtSummaryTransformer.transform,
    ),
    pagination: {
      current: page,
      limit,
      records: total,
      pages: Math.ceil(total / limit),
    } satisfies IPage.IPagination,
  };
}
