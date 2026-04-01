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
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchHrmPlatformMemberRoles(props: {
  member: MemberPayload;
  body: IHrmPlatformRole.IRequest;
}): Promise<IPageIHrmPlatformRole.ISummary> {
  // Get member's employee record to determine organization
  const employee = await MyGlobal.prisma.hrm_platform_employees.findFirst({
    where: {
      hrm_platform_user_id: props.member.id,
      deleted_at: null,
    },
  });
  if (!employee) {
    throw new HttpException("Member has no organization assignment", 403);
  }
  const organizationId = employee.hrm_platform_organization_id;
  // Build where clause for filtering
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
    ...(props.body.is_builtin != null && {
      is_builtin: props.body.is_builtin,
    }),
  };
  // Pagination
  const page = props.body.page ?? 1;
  const limit = props.body.limit ?? 20;
  const skip = (page - 1) * limit;
  // Get roles with permissions
  const roles = await MyGlobal.prisma.hrm_platform_roles.findMany({
    where: whereInput,
    skip,
    take: limit,
    orderBy: [{ is_builtin: "desc" }, { name: "asc" }],
    include: {
      permissions: {
        where: { deleted_at: null },
        include: {
          permission: {
            select: {
              code: true,
            },
          },
        },
      },
    },
  });
  // Get total count
  const total = await MyGlobal.prisma.hrm_platform_roles.count({
    where: whereInput,
  });
  // Transform to response format
  const data = roles.map((role) => {
    return {
      id: role.id,
      code: role.code,
      name: role.name,
      description: role.description ?? null,
      is_builtin: role.is_builtin,
      permissions: role.permissions.map((rp) => rp.permission.code),
      created_at: toISOStringSafe(role.created_at),
      deleted_at: role.deleted_at ? toISOStringSafe(role.deleted_at) : null,
    } satisfies IHrmPlatformRole.ISummary;
  });
  return {
    data,
    pagination: {
      current: page,
      limit,
      records: total,
      pages: Math.ceil(total / limit),
    },
  } satisfies IPageIHrmPlatformRole.ISummary;
}
