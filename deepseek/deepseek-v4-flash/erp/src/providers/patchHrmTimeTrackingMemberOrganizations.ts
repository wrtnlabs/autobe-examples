import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IHrmTimeTrackingMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingMember";
import { IHrmTimeTrackingOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingOrganization";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageIHrmTimeTrackingOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIHrmTimeTrackingOrganization";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { MemberPayload } from "../decorators/payload/MemberPayload";
import { HrmTimeTrackingOrganizationAtSummaryTransformer } from "../transformers/HrmTimeTrackingOrganizationAtSummaryTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchHrmTimeTrackingMemberOrganizations(props: {
  member: MemberPayload;
  body: IHrmTimeTrackingOrganization.IRequest;
}): Promise<IPageIHrmTimeTrackingOrganization.ISummary> {
  const page = props.body.page ?? 1;
  const limit = props.body.limit ?? 20;
  const skip = (page - 1) * limit;
  const where: Prisma.hrm_time_tracking_organizationsWhereInput = {
    OR: [
      { hrm_time_tracking_member_id: props.member.id },
      {
        employees: {
          some: { hrm_time_tracking_member_id: props.member.id },
        },
      },
    ],
  };
  if (props.body.search && props.body.search.length > 0) {
    where.name = { contains: props.body.search, mode: "insensitive" };
  }
  if (props.body.status !== undefined) {
    where.status = props.body.status;
  } else {
    where.status = "active";
  }
  if (props.body.currency !== undefined) {
    where.currency = props.body.currency;
  }
  if (props.body.timezone !== undefined) {
    where.timezone = props.body.timezone;
  }
  const sortField = props.body.sort_field ?? "name";
  const sortDirection =
    props.body.sort_direction === "desc" ? ("desc" as const) : ("asc" as const);
  const orderBy = {
    [sortField]: sortDirection,
  } satisfies Prisma.hrm_time_tracking_organizationsOrderByWithRelationInput;
  const records =
    await MyGlobal.prisma.hrm_time_tracking_organizations.findMany({
      ...HrmTimeTrackingOrganizationAtSummaryTransformer.select(),
      where,
      skip,
      take: limit,
      orderBy,
    });
  const total = await MyGlobal.prisma.hrm_time_tracking_organizations.count({
    where,
  });
  return {
    pagination: {
      current: page,
      limit,
      records: total,
      pages: Math.ceil(total / limit),
    } satisfies IPage.IPagination,
    data: await ArrayUtil.asyncMap(
      records,
      HrmTimeTrackingOrganizationAtSummaryTransformer.transform,
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
// import { IHrmTimeTrackingOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingOrganization";
// import { IPageIHrmTimeTrackingOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIHrmTimeTrackingOrganization";
// import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
// import { IHrmTimeTrackingMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingMember";
// 
// // DON'T CHANGE FUNCTION NAME AND PARAMETERS,
// // ONLY YOU HAVE TO WRITE THIS FUNCTION BODY, AND USE IMPORTED.
// export async function patchHrmTimeTrackingMemberOrganizations(props: {
//   member: MemberPayload;
//   body: IHrmTimeTrackingOrganization.IRequest;
// }): Promise<IPageIHrmTimeTrackingOrganization.ISummary> {
//   const records = await MyGlobal.prisma.hrm_time_tracking_organizations.findMany({
//     ...HrmTimeTrackingOrganizationAtSummaryTransformer.select(),
//     ...,
//   });
//   return {
//     pagination: {
//       current: ...,
//       limit: ...,
//       records: ...,
//       pages: ...,
//     },
//     data: await ArrayUtil.asyncMap(records, HrmTimeTrackingOrganizationAtSummaryTransformer.transform),
//   };
// }
// ```
//--------------------------------------------------------------