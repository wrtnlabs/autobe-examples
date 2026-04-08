import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IHrmPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformMember";
import { IHrmPlatformOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformOrganization";
import { IHrmPlatformOrganizationMembership } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformOrganizationMembership";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageIHrmPlatformOrganizationMembership } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIHrmPlatformOrganizationMembership";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { MemberPayload } from "../decorators/payload/MemberPayload";
import { HrmPlatformOrganizationMembershipAtSummaryTransformer } from "../transformers/HrmPlatformOrganizationMembershipAtSummaryTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchHrmPlatformMemberMemberships(props: {
  member: MemberPayload;
  body: IHrmPlatformOrganizationMembership.IRequest;
}): Promise<IPageIHrmPlatformOrganizationMembership.ISummary> {
  const page = props.body.page ?? 1;
  const limit = Math.min(props.body.limit ?? 20, 100);
  const skip = (page - 1) * limit;
  const userMemberships =
    await MyGlobal.prisma.hrm_platform_organization_memberships.findMany({
      where: {
        hrm_platform_member_id: props.member.id,
        deleted_at: null,
      },
      select: {
        hrm_platform_organization_id: true,
      },
    });
  const allowedOrganizationIds = userMemberships.map(
    (m) => m.hrm_platform_organization_id,
  );
  const whereInput: Prisma.hrm_platform_organization_membershipsWhereInput = {
    deleted_at: null,
    hrm_platform_organization_id: {
      in: allowedOrganizationIds,
    },
    ...(props.body.hrm_platform_organization_id !== undefined &&
      props.body.hrm_platform_organization_id !== null && {
        hrm_platform_organization_id: props.body.hrm_platform_organization_id,
      }),
    ...(props.body.hrm_platform_member_id !== undefined &&
      props.body.hrm_platform_member_id !== null && {
        hrm_platform_member_id: props.body.hrm_platform_member_id,
      }),
    ...(props.body.is_owner !== undefined &&
      props.body.is_owner !== null && {
        is_owner: props.body.is_owner,
      }),
    ...(props.body.search !== undefined &&
      props.body.search !== null && {
        OR: [
          {
            member: {
              email: {
                contains: props.body.search,
                mode: "insensitive",
              },
            },
          },
          {
            organization: {
              name: {
                contains: props.body.search,
                mode: "insensitive",
              },
            },
          },
        ],
      }),
  } satisfies Prisma.hrm_platform_organization_membershipsWhereInput;
  const sortParts = props.body.sort?.split(":") ?? [];
  const validFields = ["id", "is_owner", "created_at", "updated_at"] as const;
  const rawField = sortParts[0];
  const sortField = validFields.includes(
    rawField as (typeof validFields)[number],
  )
    ? rawField
    : "created_at";
  const sortDirection = sortParts[1] === "asc" ? "asc" : "desc";
  const orderByInput = {
    [sortField]: sortDirection,
  } satisfies Prisma.hrm_platform_organization_membershipsOrderByWithRelationInput;
  const memberships =
    await MyGlobal.prisma.hrm_platform_organization_memberships.findMany({
      where: whereInput,
      skip,
      take: limit,
      orderBy: orderByInput,
      ...HrmPlatformOrganizationMembershipAtSummaryTransformer.select(),
    });
  const total =
    await MyGlobal.prisma.hrm_platform_organization_memberships.count({
      where: whereInput,
    });
  return {
    data: await ArrayUtil.asyncMap(
      memberships,
      HrmPlatformOrganizationMembershipAtSummaryTransformer.transform,
    ),
    pagination: {
      current: page,
      limit: limit,
      records: total,
      pages: Math.ceil(total / limit),
    } satisfies IPage.IPagination,
  } satisfies IPageIHrmPlatformOrganizationMembership.ISummary;
}
