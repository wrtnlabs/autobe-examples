import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IHrmTimeTrackingMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingMember";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageIHrmTimeTrackingMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIHrmTimeTrackingMember";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { HrmTimeTrackingMemberAtSummaryTransformer } from "../transformers/HrmTimeTrackingMemberAtSummaryTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchHrmTimeTrackingMembers(props: {
  body: IHrmTimeTrackingMember.IRequest;
}): Promise<IPageIHrmTimeTrackingMember.ISummary> {
  const page = props.body.page ?? 1;
  const limit = props.body.limit ?? 100;
  const skip = (page - 1) * limit;
  const where: Prisma.hrm_time_tracking_membersWhereInput = {};
  if ((props.body.status ?? "active") === "active") {
    where.deleted_at = null;
  } else if (props.body.status === "deleted") {
    where.deleted_at = { not: null };
  }
  if (props.body.search !== undefined) {
    where.OR = [
      { email: { contains: props.body.search } },
      { display_name: { contains: props.body.search } },
      { phone_number: { contains: props.body.search } },
    ];
  }
  if (props.body.email !== undefined) {
    where.email = { contains: props.body.email };
  }
  if (props.body.display_name !== undefined) {
    where.display_name = { contains: props.body.display_name };
  }
  if (
    props.body.phone_number !== undefined &&
    props.body.phone_number !== null
  ) {
    where.phone_number = { contains: props.body.phone_number };
  }
  if (
    props.body.from_created_at !== undefined ||
    props.body.to_created_at !== undefined
  ) {
    const createdAtFilter: Prisma.DateTimeFilter = {};
    if (props.body.from_created_at !== undefined) {
      createdAtFilter.gte = props.body.from_created_at;
    }
    if (props.body.to_created_at !== undefined) {
      createdAtFilter.lte = props.body.to_created_at;
    }
    where.created_at = createdAtFilter;
  }
  const orderBy: Prisma.hrm_time_tracking_membersOrderByWithRelationInput =
    props.body.sort === "email"
      ? { email: "asc" }
      : props.body.sort === "display_name"
        ? { display_name: "asc" }
        : { created_at: "desc" };
  const records = await MyGlobal.prisma.hrm_time_tracking_members.findMany({
    where,
    skip,
    take: limit,
    orderBy,
    ...HrmTimeTrackingMemberAtSummaryTransformer.select(),
  });
  const total = await MyGlobal.prisma.hrm_time_tracking_members.count({
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
      HrmTimeTrackingMemberAtSummaryTransformer.transform,
    ),
  } satisfies IPageIHrmTimeTrackingMember.ISummary;
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
// import { IHrmTimeTrackingMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingMember";
// import { IPageIHrmTimeTrackingMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIHrmTimeTrackingMember";
// import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
// 
// // DON'T CHANGE FUNCTION NAME AND PARAMETERS,
// // ONLY YOU HAVE TO WRITE THIS FUNCTION BODY, AND USE IMPORTED.
// export async function patchHrmTimeTrackingMembers(props: {
//   body: IHrmTimeTrackingMember.IRequest;
// }): Promise<IPageIHrmTimeTrackingMember.ISummary> {
//   const records = await MyGlobal.prisma.hrm_time_tracking_members.findMany({
//     ...HrmTimeTrackingMemberAtSummaryTransformer.select(),
//     ...,
//   });
//   return {
//     pagination: {
//       current: ...,
//       limit: ...,
//       records: ...,
//       pages: ...,
//     },
//     data: await ArrayUtil.asyncMap(records, HrmTimeTrackingMemberAtSummaryTransformer.transform),
//   };
// }
// ```
//--------------------------------------------------------------