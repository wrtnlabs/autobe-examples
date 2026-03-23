import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IHrmPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformMember";
import { IHrmPlatformOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformOrganization";
import { IHrmPlatformOrganizationLogo } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformOrganizationLogo";
import { IHrmPlatformOrganizationSetting } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformOrganizationSetting";
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
import { AdminPayload } from "../decorators/payload/AdminPayload";
import { HrmPlatformRoleAtSummaryTransformer } from "../transformers/HrmPlatformRoleAtSummaryTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchHrmPlatformAdminRoles(props: {
  admin: AdminPayload;
  body: IHrmPlatformRole.IRequest;
}): Promise<IPageIHrmPlatformRole.ISummary> {
  const page = props.body.page ?? 1;
  const limit = props.body.limit ?? 20;
  const skip = (page - 1) * limit;
  // Build where clause
  const whereInput: Prisma.hrm_platform_rolesWhereInput = {
    deleted_at: null,
  } satisfies Prisma.hrm_platform_rolesWhereInput;
  // Add search filter
  if (props.body.search !== undefined && props.body.search !== null) {
    whereInput.name = {
      contains: props.body.search,
      mode: "insensitive",
    };
  }
  // Add is_builtin filter
  if (props.body.is_builtin !== undefined && props.body.is_builtin !== null) {
    whereInput.is_builtin = props.body.is_builtin;
  }
  // Build order by clause with validation
  const sort = props.body.sort ?? "created_at";
  const order = props.body.order ?? "desc";
  const orderByInput: Prisma.hrm_platform_rolesOrderByWithRelationInput =
    sort === "name"
      ? { name: order as "asc" | "desc" }
      : sort === "updated_at"
        ? { updated_at: order as "asc" | "desc" }
        : { created_at: order as "asc" | "desc" };
  // Query roles with counts using transformer select
  const data = await MyGlobal.prisma.hrm_platform_roles.findMany({
    where: whereInput,
    skip,
    take: limit,
    orderBy: orderByInput,
    ...HrmPlatformRoleAtSummaryTransformer.select(),
  });
  // Get total count for pagination
  const total = await MyGlobal.prisma.hrm_platform_roles.count({
    where: whereInput,
  });
  // Transform results using the transformer
  const transformedData = await ArrayUtil.asyncMap(
    data,
    HrmPlatformRoleAtSummaryTransformer.transform,
  );
  return {
    data: transformedData,
    pagination: {
      current: page,
      limit: limit,
      records: total,
      pages: Math.ceil(total / limit),
    } satisfies IPage.IPagination,
  };
}
