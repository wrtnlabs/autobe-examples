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
  const page = props.body.page ?? 1;
  const limit = Math.min(props.body.limit ?? 20, 100);
  const skip = (page - 1) * limit;
  const created_at: Prisma.DateTimeFilter = {};
  if (props.body.created_at_from !== undefined) {
    created_at.gte = props.body.created_at_from;
  }
  if (props.body.created_at_to !== undefined) {
    created_at.lte = props.body.created_at_to;
  }
  const whereInput: Prisma.hrm_platform_organizationsWhereInput = {
    deleted_at: null,
    OR: [
      { owner_id: props.member.id },
      {
        employees: {
          some: {
            member_id: props.member.id,
            deleted_at: null,
          },
        },
      },
    ],
    ...(props.body.search !== undefined && {
      name: { contains: props.body.search, mode: "insensitive" },
    }),
    ...(props.body.owner_id !== undefined && {
      owner_id: props.body.owner_id,
    }),
    ...(Object.keys(created_at).length > 0 && {
      created_at: created_at,
    }),
  } satisfies Prisma.hrm_platform_organizationsWhereInput;
  const orderByInput: Prisma.hrm_platform_organizationsOrderByWithRelationInput =
    props.body.sort !== undefined
      ? {
          [props.body.sort]: props.body.order ?? "asc",
        }
      : { created_at: "desc" };
  const data = await MyGlobal.prisma.hrm_platform_organizations.findMany({
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
    } satisfies Prisma.hrm_platform_organizationsSelect,
  });
  const total = await MyGlobal.prisma.hrm_platform_organizations.count({
    where: whereInput,
  });
  return {
    pagination: {
      current: page,
      limit: limit,
      records: total,
      pages: Math.ceil(total / limit),
    } satisfies IPage.IPagination,
    data: data.map(
      (org) =>
        ({
          id: org.id,
          name: org.name,
          description: org.description,
          logo_url: org.logo_url,
          currency: org.currency,
          timezone: org.timezone,
          fiscal_start_month: org.fiscal_start_month,
          created_at: toISOStringSafe(org.created_at),
        }) satisfies IHrmPlatformOrganization.ISummary,
    ),
  } satisfies IPageIHrmPlatformOrganization.ISummary;
}
