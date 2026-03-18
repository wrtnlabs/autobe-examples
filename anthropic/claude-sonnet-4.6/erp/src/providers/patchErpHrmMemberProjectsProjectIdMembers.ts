import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IErpHrmDepartment } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmDepartment";
import { IErpHrmMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmMember";
import { IErpHrmOrganizationMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmOrganizationMember";
import { IErpHrmProject } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmProject";
import { IErpHrmProjectMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmProjectMember";
import { IErpHrmRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmRole";
import { IErpHrmRolePermission } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmRolePermission";
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
  // 1. Look up project and validate it exists
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
  // 2. Find caller's org member record scoped to the project's organization
  const callerOrgMember =
    await MyGlobal.prisma.erp_hrm_organization_members.findFirst({
      where: {
        member_id: props.member.id,
        organization_id: project.organization_id,
        deleted_at: null,
      },
      select: {
        id: true,
        role: {
          select: {
            permissions: {
              select: {
                permission_code: true,
              },
            },
          },
        },
      },
    });
  if (!callerOrgMember) {
    throw new HttpException("Forbidden", 403);
  }
  // 3. Authorization: project:manage permission OR active project member
  const hasProjectManage = callerOrgMember.role.permissions.some(
    (p) => p.permission_code === "project:manage",
  );
  if (!hasProjectManage) {
    const isMember = await MyGlobal.prisma.erp_hrm_project_members.findFirst({
      where: {
        project_id: props.projectId,
        organization_member_id: callerOrgMember.id,
        deleted_at: null,
      },
      select: { id: true },
    });
    if (!isMember) {
      throw new HttpException("Forbidden", 403);
    }
  }
  // 4. Pagination defaults
  const page = props.body.page ?? 1;
  const limit = props.body.limit ?? 20;
  const skip = (page - 1) * limit;
  // 5. Build where clause
  const whereInput = {
    project_id: props.projectId,
    deleted_at: null,
    ...(props.body.projectRole != null && {
      project_role: props.body.projectRole,
    }),
    ...(props.body.organizationMemberId != null && {
      organization_member_id: props.body.organizationMemberId,
    }),
    ...((props.body.createdAtFrom != null ||
      props.body.createdAtTo != null) && {
      created_at: {
        ...(props.body.createdAtFrom != null && {
          gte: new Date(props.body.createdAtFrom),
        }),
        ...(props.body.createdAtTo != null && {
          lte: new Date(props.body.createdAtTo),
        }),
      },
    }),
  } satisfies Prisma.erp_hrm_project_membersWhereInput;
  // 6. Sort direction
  const sortOrder: "asc" | "desc" =
    props.body.order?.toUpperCase() === "ASC" ? "asc" : "desc";
  const sortField = props.body.sort ?? "created_at";
  const orderByInput = (
    sortField === "project_role"
      ? { project_role: sortOrder }
      : sortField === "updated_at"
        ? { updated_at: sortOrder }
        : { created_at: sortOrder }
  ) satisfies Prisma.erp_hrm_project_membersOrderByWithRelationInput;
  // 7. Paginated query + count
  const data = await MyGlobal.prisma.erp_hrm_project_members.findMany({
    where: whereInput,
    skip,
    take: limit,
    orderBy: orderByInput,
    ...ErpHrmProjectMemberAtSummaryTransformer.select(),
  });
  const total = await MyGlobal.prisma.erp_hrm_project_members.count({
    where: whereInput,
  });
  // 8. Return paginated response
  return {
    pagination: {
      current: page,
      limit,
      records: total,
      pages: Math.ceil(total / limit),
    } satisfies IPage.IPagination,
    data: await ArrayUtil.asyncMap(
      data,
      ErpHrmProjectMemberAtSummaryTransformer.transform,
    ),
  };
}
