import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IHrmPlatformRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformRole";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageIHrmPlatformRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIHrmPlatformRole";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { MemberPayload } from "../decorators/payload/MemberPayload";
import { HrmPlatformRoleAtSummaryTransformer } from "../transformers/HrmPlatformRoleAtSummaryTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchHrmPlatformMemberRoles(props: {
  member: MemberPayload;
  body: IHrmPlatformRole.IRequest;
}): Promise<IPageIHrmPlatformRole.ISummary> {
  // Resolve organization context from member's employee record
  const employee = await MyGlobal.prisma.hrm_platform_employees.findFirst({
    where: {
      hrm_platform_user_id: props.member.id,
      deleted_at: null,
    },
    select: {
      hrm_platform_organization_id: true,
    },
  });
  if (!employee) {
    throw new HttpException("Member has no organization membership", 403);
  }
  const organizationId = employee.hrm_platform_organization_id;
  // Build where clause with filters
  const whereInput: Prisma.hrm_platform_rolesWhereInput = {
    hrm_platform_organization_id: organizationId,
    deleted_at: null,
    ...(props.body.search && {
      OR: [
        { name: { contains: props.body.search, mode: "insensitive" } },
        { code: { contains: props.body.search, mode: "insensitive" } },
      ],
    }),
    ...(props.body.name && {
      name: { contains: props.body.name, mode: "insensitive" },
    }),
    ...(props.body.code && {
      code: { contains: props.body.code, mode: "insensitive" },
    }),
    ...(props.body.is_builtin !== undefined &&
      props.body.is_builtin !== null && {
        is_builtin: props.body.is_builtin,
      }),
  };
  // Build order by
  const orderByInput: Prisma.hrm_platform_rolesOrderByWithRelationInput[] = [
    { is_builtin: "desc" },
    { name: "asc" },
  ];
  // Pagination parameters
  const page = props.body.page ?? 1;
  const limit = props.body.limit ?? 20;
  const skip = (page - 1) * limit;
  // Execute query for data
  const roles = await MyGlobal.prisma.hrm_platform_roles.findMany({
    where: whereInput,
    skip,
    take: limit,
    orderBy: orderByInput,
    ...HrmPlatformRoleAtSummaryTransformer.select(),
  });
  // Execute count query
  const total = await MyGlobal.prisma.hrm_platform_roles.count({
    where: whereInput,
  });
  // Transform results
  const data = await ArrayUtil.asyncMap(
    roles,
    HrmPlatformRoleAtSummaryTransformer.transform,
  );
  // Calculate pagination metadata
  const pages = Math.ceil(total / limit);
  return {
    data,
    pagination: {
      current: page,
      limit,
      records: total,
      pages,
    } satisfies IPage.IPagination,
  } satisfies IPageIHrmPlatformRole.ISummary;
}
