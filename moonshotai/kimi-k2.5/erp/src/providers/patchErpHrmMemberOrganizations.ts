import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IErpHrmMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmMember";
import { IErpHrmOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmOrganization";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageIErpHrmOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIErpHrmOrganization";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { MemberPayload } from "../decorators/payload/MemberPayload";
import { ErpHrmOrganizationAtSummaryTransformer } from "../transformers/ErpHrmOrganizationAtSummaryTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchErpHrmMemberOrganizations(props: {
  member: MemberPayload;
  body: IErpHrmOrganization.IRequest;
}): Promise<IPageIErpHrmOrganization.ISummary> {
  const page = props.body.page ?? 1;
  const limit = props.body.limit ?? 20;
  const skip = (page - 1) * limit;
  // Build filter conditions
  const whereInput = {
    // Only include non-deleted unless includeDeleted is true
    ...(props.body.includeDeleted !== true && { deleted_at: null }),
    // Name partial match
    ...(props.body.name !== undefined &&
      props.body.name.length > 0 && {
        name: { contains: props.body.name },
      }),
    // Owner ID exact match
    ...(props.body.ownerId !== undefined && {
      owner_id: props.body.ownerId,
    }),
    // Currency exact match
    ...(props.body.currency !== undefined &&
      props.body.currency.length > 0 && {
        currency: props.body.currency,
      }),
    // Timezone exact match
    ...(props.body.timezone !== undefined &&
      props.body.timezone.length > 0 && {
        timezone: props.body.timezone,
      }),
    // Created date range
    ...(props.body.createdAtFrom !== undefined ||
    props.body.createdAtTo !== undefined
      ? {
          created_at: {
            ...(props.body.createdAtFrom !== undefined && {
              gte: props.body.createdAtFrom,
            }),
            ...(props.body.createdAtTo !== undefined && {
              lte: props.body.createdAtTo,
            }),
          },
        }
      : {}),
    // Access control: member must own OR be a member of the organization
    OR: [
      { owner_id: props.member.id },
      {
        organizationMembers: {
          some: {
            user_id: props.member.id,
            deleted_at: null,
          },
        },
      },
    ],
  } satisfies Prisma.erp_hrm_organizationsWhereInput;
  // Determine sort order
  const orderBy = (() => {
    const sortBy = props.body.sortBy ?? "createdAt";
    const sortOrder = props.body.sortOrder ?? "desc";
    switch (sortBy) {
      case "name":
        return { name: sortOrder as "asc" | "desc" };
      case "updatedAt":
        return { updated_at: sortOrder as "asc" | "desc" };
      case "createdAt":
      default:
        return { created_at: sortOrder as "asc" | "desc" };
    }
  })() satisfies Prisma.erp_hrm_organizationsOrderByWithRelationInput;
  // Query organizations
  const organizations = await MyGlobal.prisma.erp_hrm_organizations.findMany({
    where: whereInput,
    skip,
    take: limit,
    orderBy,
    ...ErpHrmOrganizationAtSummaryTransformer.select(),
  });
  // Count total
  const total = await MyGlobal.prisma.erp_hrm_organizations.count({
    where: whereInput,
  });
  // Transform results
  const data = await ArrayUtil.asyncMap(
    organizations,
    ErpHrmOrganizationAtSummaryTransformer.transform,
  );
  return {
    data,
    pagination: {
      current: page,
      limit: limit,
      records: total,
      pages: Math.ceil(total / limit),
    } satisfies IPage.IPagination,
  };
}
