import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IHrmOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmOrganization";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageIHrmOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIHrmOrganization";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { MemberPayload } from "../decorators/payload/MemberPayload";
import { HrmOrganizationAtSummaryTransformer } from "../transformers/HrmOrganizationAtSummaryTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchHrmMemberOrganizations(props: {
  member: MemberPayload;
  body: IHrmOrganization.IRequest;
}): Promise<IPageIHrmOrganization.ISummary> {
  // Get organization IDs where member has membership
  const [employeeOrgs, ownerOrgs] = await Promise.all([
    MyGlobal.prisma.hrm_employees.findMany({
      where: {
        user_id: props.member.id,
        deleted_at: null,
      },
      select: {
        organization_id: true,
      },
    }),
    MyGlobal.prisma.hrm_organization_owners.findMany({
      where: {
        user_id: props.member.id,
      },
      select: {
        organization_id: true,
      },
    }),
  ]);
  const organizationIds = new Set<string>();
  for (const emp of employeeOrgs) {
    organizationIds.add(emp.organization_id);
  }
  for (const own of ownerOrgs) {
    organizationIds.add(own.organization_id);
  }
  if (organizationIds.size === 0) {
    return {
      pagination: {
        current: 1,
        limit: props.body.limit ?? 20,
        records: 0,
        pages: 0,
      },
      data: [],
    };
  }
  // Build base where clause for membership filtering
  const baseWhere: Prisma.hrm_organizationsWhereInput = {
    id: {
      in: Array.from(organizationIds),
    },
  };
  // Apply search filter
  if (props.body.search && props.body.search.trim().length > 0) {
    const searchTerms = props.body.search
      .trim()
      .split(/\s+/)
      .filter((term) => term.length > 0);
    if (searchTerms.length > 0) {
      baseWhere.AND = searchTerms.map((term) => ({
        OR: [
          {
            name: {
              contains: term,
              mode: "insensitive",
            },
          },
          {
            description: {
              contains: term,
              mode: "insensitive",
            },
          },
        ],
      }));
    }
  }
  // Apply active filter
  const activeFilter = props.body.active ?? true;
  if (activeFilter) {
    baseWhere.deleted_at = null;
  } else {
    baseWhere.deleted_at = {
      not: null,
    };
  }
  // Validate limit
  const limit: number = props.body.limit ?? 20;
  if (limit < 1 || limit > 100) {
    throw new HttpException("Limit must be between 1 and 100", 400);
  }
  // Build query where clause with cursor
  const queryWhere: Prisma.hrm_organizationsWhereInput = { ...baseWhere };
  if (props.body.cursor !== undefined && props.body.cursor !== null) {
    queryWhere.created_at = {
      gt: props.body.cursor,
    };
  }
  // Fetch records with cursor-based pagination
  const records = await MyGlobal.prisma.hrm_organizations.findMany({
    where: queryWhere,
    ...HrmOrganizationAtSummaryTransformer.select(),
    orderBy: {
      created_at: "asc",
    },
    take: limit + 1,
  });
  // Check if there are more records
  const hasMore = records.length > limit;
  const data = hasMore ? records.slice(0, limit) : records;
  // Count total records matching base criteria (without cursor)
  const total = await MyGlobal.prisma.hrm_organizations.count({
    where: baseWhere,
  });
  return {
    pagination: {
      current: 1,
      limit: limit,
      records: total,
      pages: Math.ceil(total / limit),
    },
    data: await ArrayUtil.asyncMap(
      data,
      HrmOrganizationAtSummaryTransformer.transform,
    ),
  };
}


//--------------------------------------------------------------
// TEMPLATE CODE
//--------------------------------------------------------------
// Complete the code below, disregard the import part and return only the function part.
// 
// ```typescript
// import { ArrayUtil } from "@nestia/e2e";
// import { HttpException } from "@nestjs/common";
// import { Prisma } from "@prisma/sdk";
// import jwt from "jsonwebtoken";
// import typia, { tags } from "typia";
// import { v4 } from "uuid";
// import { MyGlobal } from "../MyGlobal";
// import { PasswordUtil } from "../utils/PasswordUtil";
// import { toISOStringSafe } from "../utils/toISOStringSafe"
// 
// import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
// import { IHrmOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmOrganization";
// import { IPageIHrmOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIHrmOrganization";
// import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
// 
// // DON'T CHANGE FUNCTION NAME AND PARAMETERS,
// // ONLY YOU HAVE TO WRITE THIS FUNCTION BODY, AND USE IMPORTED.
// export async function patchHrmMemberOrganizations(props: {
//   member: MemberPayload;
//   body: IHrmOrganization.IRequest;
// }): Promise<IPageIHrmOrganization.ISummary> {
//   const records = await MyGlobal.prisma.hrm_organizations.findMany({
//     ...HrmOrganizationAtSummaryTransformer.select(),
//     ...,
//   });
//   return {
//     pagination: {
//       current: ...,
//       limit: ...,
//       records: ...,
//       pages: ...,
//     },
//     data: await ArrayUtil.asyncMap(records, HrmOrganizationAtSummaryTransformer.transform),
//   };
// }
// ```
//--------------------------------------------------------------