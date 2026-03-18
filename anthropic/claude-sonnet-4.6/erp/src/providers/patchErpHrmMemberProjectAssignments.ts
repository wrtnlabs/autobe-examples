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

export async function patchErpHrmMemberProjectAssignments(props: {
  member: MemberPayload;
  body: IErpHrmProjectMember.IRequest;
}): Promise<IPageIErpHrmProjectMember.ISummary> {
  // Step 1: Resolve organization context and verify project:manage permission
  const orgMember =
    await MyGlobal.prisma.erp_hrm_organization_members.findFirst({
      where: {
        member_id: props.member.id,
        status: "active",
        deleted_at: null,
        role: {
          permissions: {
            some: {
              permission_code: "project:manage",
            },
          },
        },
      },
      select: {
        id: true,
        organization_id: true,
      },
    });
  if (orgMember === null) {
    throw new HttpException("Forbidden", 403);
  }
  // Step 2: Build pagination params
  const page = props.body.page ?? 1;
  const limit = props.body.limit ?? 20;
  const skip = (page - 1) * limit;
  // Step 3: Build safe sort field and direction
  const rawSort = props.body.sort ?? "created_at";
  const sortField =
    rawSort === "updated_at"
      ? "updated_at"
      : rawSort === "project_role"
        ? "project_role"
        : "created_at";
  const rawOrder = (props.body.order ?? "DESC").toUpperCase();
  const orderDir = rawOrder === "ASC" ? ("asc" as const) : ("desc" as const);
  const orderByInput = (
    sortField === "updated_at"
      ? { updated_at: orderDir }
      : sortField === "project_role"
        ? { project_role: orderDir }
        : { created_at: orderDir }
  ) satisfies Prisma.erp_hrm_project_membersOrderByWithRelationInput;
  // Step 4: Build where clause
  const whereInput = {
    deleted_at: null,
    project: {
      organization_id: orgMember.organization_id,
      deleted_at: null,
    },
    ...(props.body.projectId != null && { project_id: props.body.projectId }),
    ...(props.body.organizationMemberId != null && {
      organization_member_id: props.body.organizationMemberId,
    }),
    ...(props.body.projectRole != null && {
      project_role: props.body.projectRole,
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
  // Step 5: Query data and count (sequential, not parallel)
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
  // Step 6: Transform and return paginated result
  return {
    pagination: {
      current: page,
      limit: limit,
      records: total,
      pages: Math.ceil(total / limit),
    } satisfies IPage.IPagination,
    data: await ArrayUtil.asyncMap(
      data,
      ErpHrmProjectMemberAtSummaryTransformer.transform,
    ),
  };
}
