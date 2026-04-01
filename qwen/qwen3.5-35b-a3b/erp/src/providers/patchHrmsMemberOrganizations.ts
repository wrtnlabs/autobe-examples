import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IHrmsMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmsMember";
import { IHrmsOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmsOrganization";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageIHrmsOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIHrmsOrganization";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { MemberPayload } from "../decorators/payload/MemberPayload";
import { HrmsOrganizationAtSummaryTransformer } from "../transformers/HrmsOrganizationAtSummaryTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchHrmsMemberOrganizations(props: {
  member: MemberPayload;
  body: IHrmsOrganization.IRequest;
}): Promise<IPageIHrmsOrganization.ISummary> {
  const page = props.body.page ?? 1;
  const limit = props.body.limit ?? 100;
  const skip = (page - 1) * limit;
  const whereInput = {
    deleted_at: null,
    ...(props.body.search !== undefined && {
      name: { contains: props.body.search, mode: "insensitive" as const },
    }),
    ...(props.body.currency !== undefined && {
      currency: props.body.currency,
    }),
    ...(props.body.timezone !== undefined && {
      timezone: props.body.timezone,
    }),
    organizationMembers: {
      some: {
        hrms_member_id: props.member.id,
        deleted_at: null,
      },
    },
  } satisfies Prisma.hrms_organizationsWhereInput;
  const [total, organizations] = await Promise.all([
    MyGlobal.prisma.hrms_organizations.count({
      where: whereInput,
    }),
    MyGlobal.prisma.hrms_organizations.findMany({
      where: whereInput,
      skip,
      take: limit,
      orderBy: { created_at: "desc" as const },
      ...HrmsOrganizationAtSummaryTransformer.select(),
    }),
  ]);
  const totalPages = Math.ceil(total / limit);
  return {
    pagination: {
      current: page,
      limit: limit,
      records: total,
      pages: totalPages,
    } satisfies IPage.IPagination,
    data: await ArrayUtil.asyncMap(
      organizations,
      HrmsOrganizationAtSummaryTransformer.transform,
    ),
  };
}
