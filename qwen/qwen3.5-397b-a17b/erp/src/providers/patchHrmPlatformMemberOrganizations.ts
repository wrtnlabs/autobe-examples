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
import { HrmPlatformOrganizationAtSummaryTransformer } from "../transformers/HrmPlatformOrganizationAtSummaryTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchHrmPlatformMemberOrganizations(props: {
  member: MemberPayload;
  body: IHrmPlatformOrganization.IRequest;
}): Promise<IPageIHrmPlatformOrganization.ISummary> {
  const page = props.body.page ?? 1;
  const limit = props.body.take ?? props.body.limit ?? 100;
  const skip = props.body.skip ?? (page - 1) * limit;
  const sort = props.body.sort ?? "created_at";
  const order = props.body.order ?? "desc";
  const whereInput: Prisma.hrm_platform_organizationsWhereInput = {
    deleted_at: null,
    organizationMemberships: {
      some: {
        hrm_platform_member_id: props.member.id,
      },
    },
    ...(props.body.search
      ? {
          name: {
            contains: props.body.search,
            mode: "insensitive",
          },
        }
      : {}),
  };
  const orderByInput: Prisma.hrm_platform_organizationsOrderByWithRelationInput =
    {
      [sort]: order,
    };
  const data = await MyGlobal.prisma.hrm_platform_organizations.findMany({
    where: whereInput,
    skip,
    take: limit,
    orderBy: orderByInput,
    ...HrmPlatformOrganizationAtSummaryTransformer.select(),
  });
  const total = await MyGlobal.prisma.hrm_platform_organizations.count({
    where: whereInput,
  });
  return {
    data: await ArrayUtil.asyncMap(
      data,
      HrmPlatformOrganizationAtSummaryTransformer.transform,
    ),
    pagination: {
      current: page,
      limit: limit,
      records: total,
      pages: Math.ceil(total / limit),
    } satisfies IPage.IPagination,
  };
}
