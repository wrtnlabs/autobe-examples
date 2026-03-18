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

export async function patchHrmPlatformMemberRolesBuiltIn(props: {
  member: MemberPayload;
  body: IHrmPlatformRole.IRequest;
}): Promise<IPageIHrmPlatformRole.ISummary> {
  // Parse pagination parameters
  const page = props.body.page ?? 1;
  const limit = props.body.limit ?? 20;
  const skip = (page - 1) * limit;
  // Build where clause for built-in roles
  const whereInput: Prisma.hrm_platform_rolesWhereInput = {
    is_builtin: true,
    deleted_at: null,
  };
  // Build order by clause
  const sortBy = props.body.sort_by ?? "created_at";
  const sortOrder = props.body.sort_order ?? "desc";
  const validSortFields = ["created_at", "name", "code"];
  const orderByInput: Prisma.hrm_platform_rolesOrderByWithRelationInput = {
    [validSortFields.includes(sortBy) ? sortBy : "created_at"]: sortOrder,
  };
  // Fetch roles
  const roles = await MyGlobal.prisma.hrm_platform_roles.findMany({
    where: whereInput,
    skip,
    take: limit,
    orderBy: orderByInput,
    select: {
      id: true,
      code: true,
      name: true,
      description: true,
      is_builtin: true,
      created_at: true,
      deleted_at: true,
    },
  });
  // Count total records
  const total = await MyGlobal.prisma.hrm_platform_roles.count({
    where: whereInput,
  });
  // Transform to ISummary format
  const data = await ArrayUtil.asyncMap(roles, async (role) =>
    typia.assert<IHrmPlatformRole.ISummary>({
      id: role.id,
      code: role.code,
      name: role.name,
      description: role.description ?? null,
      is_builtin: role.is_builtin,
      permissions: [],
      created_at: toISOStringSafe(role.created_at),
      deleted_at: role.deleted_at
        ? toISOStringSafe(role.deleted_at as Date)
        : null,
    }),
  );
  return typia.assert<IPageIHrmPlatformRole.ISummary>({
    pagination: typia.assert<IPage.IPagination>({
      current: page,
      limit,
      records: total,
      pages: Math.ceil(total / limit),
    }),
    data,
  });
}
