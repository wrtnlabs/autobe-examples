import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IHrmPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformMember";
import { IHrmPlatformOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformOrganization";
import { IHrmPlatformOrganizationLogo } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformOrganizationLogo";
import { IHrmPlatformOrganizationSetting } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformOrganizationSetting";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageIHrmPlatformOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIHrmPlatformOrganization";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { HrmPlatformOrganizationAtSummaryTransformer } from "../transformers/HrmPlatformOrganizationAtSummaryTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchHrmPlatformOrganizations(props: {
  body: IHrmPlatformOrganization.IRequest;
}): Promise<IPageIHrmPlatformOrganization.ISummary> {
  const page = props.body.page ?? 1;
  const limit = props.body.limit ?? 20;
  const skip = (page - 1) * limit;
  // Build where clause
  const whereInput: Prisma.hrm_platform_organizationsWhereInput = {};
  // Search filter - case-insensitive partial match on name
  if (props.body.search != null && props.body.search !== "") {
    whereInput.name = {
      contains: props.body.search,
      mode: "insensitive",
    };
  }
  // Status filter - active or deleted
  if (props.body.status === "active") {
    whereInput.deleted_at = null;
  } else if (props.body.status === "deleted") {
    whereInput.deleted_at = {
      not: null,
    };
  }
  // Build orderBy clause
  const orderByInput: Prisma.hrm_platform_organizationsOrderByWithRelationInput =
    props.body.sortBy === "name"
      ? { name: props.body.sortOrder ?? "asc" }
      : props.body.sortBy === "updated_at"
        ? { updated_at: props.body.sortOrder ?? "desc" }
        : { created_at: props.body.sortOrder ?? "desc" };
  // Query organizations
  const data = await MyGlobal.prisma.hrm_platform_organizations.findMany({
    where: whereInput,
    skip,
    take: limit,
    orderBy: orderByInput,
    ...HrmPlatformOrganizationAtSummaryTransformer.select(),
  });
  // Get total count
  const total = await MyGlobal.prisma.hrm_platform_organizations.count({
    where: whereInput,
  });
  // Transform results
  const transformed = await ArrayUtil.asyncMap(
    data,
    HrmPlatformOrganizationAtSummaryTransformer.transform,
  );
  return {
    pagination: {
      current: page,
      limit: limit,
      records: total,
      pages: Math.ceil(total / limit),
    } satisfies IPage.IPagination,
    data: transformed,
  };
}
