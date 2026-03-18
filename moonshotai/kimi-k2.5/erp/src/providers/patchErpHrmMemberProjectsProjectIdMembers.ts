import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IErpHrmDepartment } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmDepartment";
import { IErpHrmMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmMember";
import { IErpHrmOrganizationMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmOrganizationMember";
import { IErpHrmProject } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmProject";
import { IErpHrmProjectMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmProjectMember";
import { IErpHrmRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmRole";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageIErpHrmProjectMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIErpHrmProjectMember";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { MemberPayload } from "../decorators/payload/MemberPayload";
import { ErpHrmProjectMemberAtSummaryTransformer } from "../transformers/ErpHrmProjectMemberAtSummaryTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchErpHrmMemberProjectsProjectIdMembers(props: {
  member: MemberPayload;
  projectId: string & tags.Format<"uuid">;
  body: IErpHrmProjectMember.IRequest;
}): Promise<IPageIErpHrmProjectMember.ISummary> {
  // Validate project exists and belongs to member's organization
  const project = await MyGlobal.prisma.erp_hrm_projects.findUniqueOrThrow({
    where: { id: props.projectId },
    select: { id: true, organization_id: true },
  });
  // Get member's organization membership to verify access
  const membership =
    await MyGlobal.prisma.erp_hrm_organization_members.findFirst({
      where: {
        user_id: props.member.id,
        organization_id: project.organization_id,
        deleted_at: null,
      },
      select: {
        id: true,
        role: {
          select: {
            name: true,
            rolePermissions: { select: { permission: true } },
          },
        },
      },
    });
  if (!membership) {
    throw new HttpException(
      "Forbidden: Not a member of this organization",
      403,
    );
  }
  // Check if member is assigned to this project as project-lead
  const projectMembership =
    await MyGlobal.prisma.erp_hrm_project_members.findFirst({
      where: {
        project_id: props.projectId,
        organizationMember: {
          user_id: props.member.id,
        },
        role: "project-lead",
        deleted_at: null,
      },
      select: { id: true },
    });
  // Verify permission: project management permission OR project-lead on this project
  const hasProjectManagePermission = membership.role.rolePermissions.some(
    (rp) => rp.permission === "project:manage",
  );
  if (!hasProjectManagePermission && !projectMembership) {
    throw new HttpException(
      "Forbidden: Insufficient permissions to view project members",
      403,
    );
  }
  // Build where clause with filters
  const whereInput: Prisma.erp_hrm_project_membersWhereInput = {
    project_id: props.projectId,
    deleted_at: null,
    ...(props.body.role && { role: props.body.role }),
    ...(props.body.organizationMemberId && {
      organization_member_id: props.body.organizationMemberId,
    }),
    ...(props.body.search && {
      organizationMember: {
        OR: [
          {
            user: {
              first_name: {
                contains: props.body.search,
                mode: "insensitive" as const,
              },
            },
          },
          {
            user: {
              last_name: {
                contains: props.body.search,
                mode: "insensitive" as const,
              },
            },
          },
          {
            position: {
              contains: props.body.search,
              mode: "insensitive" as const,
            },
          },
          {
            department: {
              name: {
                contains: props.body.search,
                mode: "insensitive" as const,
              },
            },
          },
        ],
      },
    }),
  };
  // Build orderBy based on sort parameter
  const sort = props.body.sort ?? "-created_at";
  let orderByInput: Prisma.erp_hrm_project_membersOrderByWithRelationInput;
  if (sort === "role" || sort === "-role") {
    orderByInput = { role: sort.startsWith("-") ? "desc" : "asc" };
  } else if (
    sort === "created_at" ||
    sort === "-created_at" ||
    sort.startsWith("-")
  ) {
    orderByInput = { created_at: sort.startsWith("-") ? "desc" : "asc" };
  } else {
    // Default sort by created_at DESC
    orderByInput = { created_at: "desc" };
  }
  // Pagination parameters
  const limit = props.body.limit ?? 20;
  const cursor = props.body.cursor;
  const page = props.body.page;
  // Get total count
  const total = await MyGlobal.prisma.erp_hrm_project_members.count({
    where: whereInput,
  });
  // Execute query with appropriate pagination strategy
  let data: Prisma.erp_hrm_project_membersGetPayload<
    ReturnType<typeof ErpHrmProjectMemberAtSummaryTransformer.select>
  >[];
  if (cursor) {
    // Cursor-based pagination
    data = await MyGlobal.prisma.erp_hrm_project_members.findMany({
      where: whereInput,
      orderBy: orderByInput,
      take: limit,
      skip: 1,
      cursor: { id: cursor },
      ...ErpHrmProjectMemberAtSummaryTransformer.select(),
    });
  } else if (page !== undefined && page !== null && page > 0) {
    // Page-based pagination
    data = await MyGlobal.prisma.erp_hrm_project_members.findMany({
      where: whereInput,
      orderBy: orderByInput,
      take: limit,
      skip: (page - 1) * limit,
      ...ErpHrmProjectMemberAtSummaryTransformer.select(),
    });
  } else {
    // Default: cursor-based without cursor (first page)
    data = await MyGlobal.prisma.erp_hrm_project_members.findMany({
      where: whereInput,
      orderBy: orderByInput,
      take: limit,
      ...ErpHrmProjectMemberAtSummaryTransformer.select(),
    });
  }
  // Transform results
  const transformedData = await ArrayUtil.asyncMap(
    data,
    ErpHrmProjectMemberAtSummaryTransformer.transform,
  );
  // Calculate pagination
  const currentPage = page ?? 1;
  const pages = Math.ceil(total / limit);
  return {
    data: transformedData,
    pagination: {
      current: currentPage,
      limit: limit,
      records: total,
      pages: pages,
    } satisfies IPage.IPagination,
  };
}
