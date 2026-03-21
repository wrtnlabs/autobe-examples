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
  const limit = props.body.limit ?? 100;
  const skip = (page - 1) * limit;
  // Build WHERE clause
  const whereInput = {
    employees: {
      some: {
        erp_hrm_member_id: props.member.id,
      },
    },
    ...(props.body.isOwner === true && { owner_id: props.member.id }),
    ...(props.body.isOwner === false && { NOT: { owner_id: props.member.id } }),
    ...(props.body.includeDeleted !== true && { deleted_at: null }),
    ...(props.body.name && {
      name: { contains: props.body.name, mode: "insensitive" as const },
    }),
  } satisfies Prisma.erp_hrm_organizationsWhereInput;
  // Query organizations
  const organizations = await MyGlobal.prisma.erp_hrm_organizations.findMany({
    where: whereInput,
    skip,
    take: limit,
    orderBy: { created_at: "desc" },
    ...ErpHrmOrganizationAtSummaryTransformer.select(),
  });
  // Count total
  const total = await MyGlobal.prisma.erp_hrm_organizations.count({
    where: whereInput,
  });
  // Transform results
  const data = await ArrayUtil.asyncMap(organizations, (org) =>
    ErpHrmOrganizationAtSummaryTransformer.transform(org, {
      memberId: props.member.id,
    }),
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
