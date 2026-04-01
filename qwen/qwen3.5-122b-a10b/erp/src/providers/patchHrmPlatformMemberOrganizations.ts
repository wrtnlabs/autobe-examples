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
  const limit = props.body.limit ?? 20;
  const skip = (page - 1) * limit;
  const whereInput: Prisma.hrm_platform_organizationsWhereInput = {
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
  const orderByInput: Prisma.hrm_platform_organizationsOrderByWithRelationInput =
    props.body.sort_by === "name"
      ? { name: props.body.sort_order ?? "asc" }
      : props.body.sort_by === "timezone"
        ? { timezone: props.body.sort_order ?? "asc" }
        : { created_at: props.body.sort_order ?? "desc" };
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
      updated_at: true,
      deleted_at: true,
    },
  });
  const total = await MyGlobal.prisma.hrm_platform_organizations.count({
    where: whereInput,
  });
  return {
    data: await ArrayUtil.asyncMap(
      data,
      async (org) =>
        ({
          id: org.id,
          name: org.name,
          description: org.description ?? undefined,
          logo_url: org.logo_url ?? undefined,
          currency: org.currency,
          timezone: org.timezone,
          fiscal_start_month: org.fiscal_start_month,
          created_at: toISOStringSafe(org.created_at),
          updated_at: toISOStringSafe(org.updated_at),
        }) satisfies IHrmPlatformOrganization.ISummary,
    ),
    pagination: {
      current: page,
      limit,
      records: total,
      pages: Math.ceil(total / limit),
    } satisfies IPage.IPagination,
  } satisfies IPageIHrmPlatformOrganization.ISummary;
}
