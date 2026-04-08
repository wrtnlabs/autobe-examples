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
  const page = props.body.page ?? 1;
  const limit = props.body.limit ?? 20;
  const skip = (page - 1) * limit;
  const membership =
    await MyGlobal.prisma.hrm_platform_organization_memberships.findFirstOrThrow(
      {
        where: {
          hrm_platform_member_id: props.member.id,
          deleted_at: null,
        },
        select: {
          hrm_platform_organization_id: true,
        },
      },
    );
  const whereInput = {
    organization_id: membership.hrm_platform_organization_id,
    deleted_at: null,
    ...(props.body.search !== undefined && {
      name: { contains: props.body.search, mode: "insensitive" as const },
    }),
    ...(props.body.is_built_in !== undefined && {
      is_built_in: props.body.is_built_in,
    }),
  } satisfies Prisma.hrm_platform_rolesWhereInput;
  const data = await MyGlobal.prisma.hrm_platform_roles.findMany({
    where: whereInput,
    skip,
    take: limit,
    orderBy: { created_at: "desc" },
    ...HrmPlatformRoleAtSummaryTransformer.select(),
  });
  const total = await MyGlobal.prisma.hrm_platform_roles.count({
    where: whereInput,
  });
  return {
    pagination: {
      current: page,
      limit: limit,
      records: total,
      pages: Math.ceil(total / limit),
    } satisfies IPage.IPagination,
    data: await ArrayUtil.asyncMap(
      data,
      HrmPlatformRoleAtSummaryTransformer.transform,
    ),
  };
}
