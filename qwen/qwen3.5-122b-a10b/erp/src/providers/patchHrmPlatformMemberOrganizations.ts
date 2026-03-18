import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IHrmPlatformOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformOrganization";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageIHrmPlatformOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIHrmPlatformOrganization";
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

export async function patchHrmPlatformMemberOrganizations(props: {
  member: MemberPayload;
  body: IHrmPlatformOrganization.IRequest;
}): Promise<IPageIHrmPlatformOrganization.ISummary> {
  // Extract pagination parameters with defaults
  const page = props.body.page ?? 1;
  const limit = props.body.limit ?? 20;
  const skip = (page - 1) * limit;
  // Extract sorting parameters with defaults
  const sortBy = props.body.sort_by ?? "created_at";
  const sortOrder = props.body.sort_order ?? "asc";
  // Build where clause: organizations where member has employee record
  const whereInput = {
    deleted_at: null,
    employees: {
      some: {
        hrm_platform_user_id: props.member.id,
        deleted_at: null,
      },
    },
    ...(props.body.search && {
      name: {
        contains: props.body.search,
        mode: "insensitive",
      },
    }),
  } satisfies Prisma.hrm_platform_organizationsWhereInput;
  // Build orderBy clause
  const orderByInput = {
    [sortBy]: sortOrder,
  } satisfies Prisma.hrm_platform_organizationsOrderByWithRelationInput;
  // Fetch paginated organizations
  const organizations =
    await MyGlobal.prisma.hrm_platform_organizations.findMany({
      where: whereInput,
      skip,
      take: limit,
      orderBy: orderByInput,
      select: {
        id: true,
        name: true,
        description: true,
        logo_url: true,
        currency: true,
        timezone: true,
        fiscal_start_month: true,
        created_at: true,
        updated_at: true,
      } satisfies Prisma.hrm_platform_organizationsSelect,
    });
  // Count total for pagination metadata
  const total = await MyGlobal.prisma.hrm_platform_organizations.count({
    where: whereInput,
  });
  // Transform to ISummary format with proper date conversion
  const data = organizations.map(
    (org) =>
      ({
        id: org.id as string & tags.Format<"uuid">,
        name: org.name,
        description: org.description ?? null,
        logo_url: org.logo_url as
          | (string & tags.Format<"url">)
          | null
          | undefined,
        currency: org.currency,
        timezone: org.timezone,
        fiscal_start_month: org.fiscal_start_month as number &
          tags.Type<"int32"> &
          tags.Minimum<1> &
          tags.Maximum<12>,
        created_at: toISOStringSafe(org.created_at) as string &
          tags.Format<"date-time">,
        updated_at: toISOStringSafe(org.updated_at) as string &
          tags.Format<"date-time">,
      }) satisfies IHrmPlatformOrganization.ISummary,
  );
  return {
    pagination: {
      current: page,
      limit: limit,
      records: total,
      pages: Math.ceil(total / limit),
    } satisfies IPage.IPagination,
    data,
  } satisfies IPageIHrmPlatformOrganization.ISummary;
}
