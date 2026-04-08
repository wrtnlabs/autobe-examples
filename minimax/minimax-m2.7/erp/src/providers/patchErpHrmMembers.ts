import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IErpHrmMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmMember";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageIErpHrmMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIErpHrmMember";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { ErpHrmMemberAtSummaryTransformer } from "../transformers/ErpHrmMemberAtSummaryTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchErpHrmMembers(props: {
  body: IErpHrmMember.IRequest;
}): Promise<IPageIErpHrmMember.ISummary> {
  const page = props.body.page ?? 1;
  const limit =
    props.body.limit !== undefined
      ? props.body.limit > 100
        ? 100
        : props.body.limit
      : 20;
  const skip = (page - 1) * limit;
  const sortBy = props.body.sortBy ?? "created_at";
  const sortOrder = props.body.sortOrder ?? "desc";
  // Validate sortBy field against allowed values to prevent SQL injection
  const allowedSortFields = ["created_at", "display_name", "email"];
  const safeSortBy = allowedSortFields.includes(sortBy) ? sortBy : "created_at";
  // Build WHERE clause with filters
  const whereInput: Prisma.erp_hrm_membersWhereInput = {
    ...(props.body.search && {
      display_name: { contains: props.body.search, mode: "insensitive" },
    }),
    ...(props.body.email && { email: props.body.email }),
    ...(props.body.createdAt && {
      created_at: {
        ...(props.body.createdAt.gte && {
          gte: new Date(props.body.createdAt.gte),
        }),
        ...(props.body.createdAt.lte && {
          lte: new Date(props.body.createdAt.lte),
        }),
      },
    }),
    ...(props.body.deleted === true
      ? { deleted_at: { not: null } }
      : props.body.deleted === false
        ? { deleted_at: null }
        : {}),
  };
  // Build ORDER BY clause
  const orderByInput: Prisma.erp_hrm_membersOrderByWithRelationInput = {
    [safeSortBy]: sortOrder,
  };
  // Execute queries sequentially
  const records = await MyGlobal.prisma.erp_hrm_members.findMany({
    where: whereInput,
    orderBy: orderByInput,
    skip,
    take: limit,
    ...ErpHrmMemberAtSummaryTransformer.select(),
  });
  const total = await MyGlobal.prisma.erp_hrm_members.count({
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
      records,
      ErpHrmMemberAtSummaryTransformer.transform,
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
// import { IErpHrmMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmMember";
// import { IPageIErpHrmMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIErpHrmMember";
// import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
// 
// // DON'T CHANGE FUNCTION NAME AND PARAMETERS,
// // ONLY YOU HAVE TO WRITE THIS FUNCTION BODY, AND USE IMPORTED.
// export async function patchErpHrmMembers(props: {
//   body: IErpHrmMember.IRequest;
// }): Promise<IPageIErpHrmMember.ISummary> {
//   const records = await MyGlobal.prisma.erp_hrm_members.findMany({
//     ...ErpHrmMemberAtSummaryTransformer.select(),
//     ...,
//   });
//   return {
//     pagination: {
//       current: ...,
//       limit: ...,
//       records: ...,
//       pages: ...,
//     },
//     data: await ArrayUtil.asyncMap(records, ErpHrmMemberAtSummaryTransformer.transform),
//   };
// }
// ```
//--------------------------------------------------------------