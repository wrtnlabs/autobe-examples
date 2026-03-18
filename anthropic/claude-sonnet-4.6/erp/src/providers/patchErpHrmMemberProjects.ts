import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IErpHrmProject } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmProject";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageIErpHrmProject } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIErpHrmProject";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { MemberPayload } from "../decorators/payload/MemberPayload";
import { ErpHrmProjectAtSummaryTransformer } from "../transformers/ErpHrmProjectAtSummaryTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchErpHrmMemberProjects(props: {
  member: MemberPayload;
  body: IErpHrmProject.IRequest;
}): Promise<IPageIErpHrmProject.ISummary> {
  // Step 1: Resolve member's organization context
  const organizationMember =
    await MyGlobal.prisma.erp_hrm_organization_members.findFirstOrThrow({
      where: {
        member_id: props.member.id,
        status: "active",
        deleted_at: null,
      },
      select: {
        organization_id: true,
        role_id: true,
      },
    });
  // Step 2: Verify project:view permission
  const permissionRecord =
    await MyGlobal.prisma.erp_hrm_role_permissions.findFirst({
      where: {
        role_id: organizationMember.role_id,
        permission_code: "project:view",
      },
      select: { id: true },
    });
  if (permissionRecord === null) {
    throw new HttpException("Forbidden: missing project:view permission", 403);
  }
  // Step 3: Pagination defaults
  const page = props.body.page ?? 1;
  const limit = props.body.limit ?? 20;
  const skip = (page - 1) * limit;
  // Step 4: Build WHERE clause
  const whereInput = {
    organization_id: organizationMember.organization_id,
    deleted_at: null,
    ...(props.body.status != null && { status: props.body.status }),
    ...(props.body.search != null && {
      name: { contains: props.body.search, mode: "insensitive" as const },
    }),
  } satisfies Prisma.erp_hrm_projectsWhereInput;
  // Step 5: Build ORDER BY clause — map sort field to Prisma orderBy without type assertions
  const sortDirection =
    props.body.order === "asc" ? ("asc" as const) : ("desc" as const);
  const sortField = props.body.sort ?? "created_at";
  const orderByInput = (
    sortField === "name"
      ? { name: sortDirection }
      : sortField === "status"
        ? { status: sortDirection }
        : sortField === "budget_hours"
          ? { budget_hours: sortDirection }
          : sortField === "started_at"
            ? { started_at: sortDirection }
            : sortField === "ended_at"
              ? { ended_at: sortDirection }
              : { created_at: sortDirection }
  ) satisfies Prisma.erp_hrm_projectsOrderByWithRelationInput;
  // Step 6: Execute queries sequentially
  const data = await MyGlobal.prisma.erp_hrm_projects.findMany({
    where: whereInput,
    skip,
    take: limit,
    orderBy: orderByInput,
    ...ErpHrmProjectAtSummaryTransformer.select(),
  });
  const total = await MyGlobal.prisma.erp_hrm_projects.count({
    where: whereInput,
  });
  // Step 7: Return paginated result
  return {
    data: await ArrayUtil.asyncMap(
      data,
      ErpHrmProjectAtSummaryTransformer.transform,
    ),
    pagination: {
      current: page,
      limit: limit,
      records: total,
      pages: total === 0 ? 0 : Math.ceil(total / limit),
    } satisfies IPage.IPagination,
  };
}
