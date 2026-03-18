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
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchHrmsMemberOrganizations(props: {
  member: MemberPayload;
  body: IHrmsOrganization.IRequest;
}): Promise<IPageIHrmsOrganization.ISummary> {
  const page = props.body.page ?? 1;
  const limit = Math.min(props.body.limit ?? 100, 100);
  const skip = (page - 1) * limit;
  // Get organization IDs where member has active membership
  const memberships = await MyGlobal.prisma.hrms_organization_members.findMany({
    where: {
      hrms_member_id: props.member.id,
      deleted_at: null,
    },
    select: { hrms_organization_id: true },
  });
  const organizationIds = memberships.map((m) => m.hrms_organization_id);
  if (organizationIds.length === 0) {
    return {
      data: [],
      pagination: {
        current: page,
        limit,
        records: 0,
        pages: 0,
      } satisfies IPage.IPagination,
    };
  }
  // Build filter conditions
  const whereInput: Prisma.hrms_organizationsWhereInput = {
    id: { in: organizationIds },
    deleted_at: null,
    ...(props.body.search !== undefined && props.body.search
      ? { name: { contains: props.body.search, mode: "insensitive" as const } }
      : {}),
    ...(props.body.currency !== undefined && { currency: props.body.currency }),
    ...(props.body.timezone !== undefined && { timezone: props.body.timezone }),
  };
  const [data, total] = await Promise.all([
    MyGlobal.prisma.hrms_organizations.findMany({
      where: whereInput,
      skip,
      take: limit,
      orderBy: { created_at: "desc" },
      include: {
        owner: {
          select: {
            id: true,
            email: true,
            display_name: true,
            avatar_uri: true,
            phone_number: true,
            created_at: true,
            updated_at: true,
            deleted_at: true,
          },
        },
      } satisfies Prisma.hrms_organizationsInclude,
    }),
    MyGlobal.prisma.hrms_organizations.count({ where: whereInput }),
  ]);
  const transformedData = await ArrayUtil.asyncMap(data, async (org) => {
    const memberMemberships =
      await MyGlobal.prisma.hrms_organization_members.count({
        where: {
          hrms_member_id: org.owner.id,
          deleted_at: null,
        },
      });
    return {
      id: org.id,
      name: org.name,
      description: org.description,
      logo_uri: org.logo_uri,
      currency: org.currency,
      timezone: org.timezone,
      fiscal_start_month: org.fiscal_start_month,
      owner: {
        id: org.owner.id,
        email: org.owner.email,
        display_name: org.owner.display_name,
        avatar_uri: org.owner.avatar_uri,
        phone_number: org.owner.phone_number,
        organization_membership_count: memberMemberships,
        created_at: org.owner.created_at.toISOString(),
        updated_at: org.owner.updated_at.toISOString(),
        deleted_at: org.owner.deleted_at?.toISOString() ?? null,
      } satisfies IHrmsMember.ISummary,
      created_at: org.created_at.toISOString(),
      updated_at: org.updated_at.toISOString(),
      deleted_at: org.deleted_at?.toISOString() ?? null,
    } satisfies IHrmsOrganization.ISummary;
  });
  return {
    data: transformedData,
    pagination: {
      current: page,
      limit,
      records: total,
      pages: Math.ceil(total / limit),
    } satisfies IPage.IPagination,
  };
}
