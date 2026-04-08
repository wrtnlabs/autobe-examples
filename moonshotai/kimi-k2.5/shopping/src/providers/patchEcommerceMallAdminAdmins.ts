import { IEcommerceMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallAdmin";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageIEcommerceMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEcommerceMallAdmin";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { AdminPayload } from "../decorators/payload/AdminPayload";
import { EcommerceMallAdminAtSummaryTransformer } from "../transformers/EcommerceMallAdminAtSummaryTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchEcommerceMallAdminAdmins(props: {
  admin: AdminPayload;
  body: IEcommerceMallAdmin.IRequest;
}): Promise<IPageIEcommerceMallAdmin.ISummary> {
  const { body } = props;
  // Build date range filter for created_at
  const dateRange: {
    gte?: Date;
    lte?: Date;
  } = {};
  if (body.createdAtMin !== undefined && body.createdAtMin !== null) {
    dateRange.gte = new Date(body.createdAtMin);
  }
  if (body.createdAtMax !== undefined && body.createdAtMax !== null) {
    dateRange.lte = new Date(body.createdAtMax);
  }
  // Build where conditions
  const where: Prisma.ecommerce_mall_adminsWhereInput = {
    ...(body.grade !== undefined &&
      body.grade !== null && { grade: body.grade }),
    ...(body.status !== undefined &&
      body.status !== null && { status: body.status }),
    ...(body.search !== undefined &&
      body.search !== null &&
      body.search !== "" && {
        nickname: { contains: body.search },
      }),
    ...(body.email !== undefined &&
      body.email !== null &&
      body.email !== "" && {
        email: { contains: body.email },
      }),
    ...((dateRange.gte !== undefined || dateRange.lte !== undefined) && {
      created_at: dateRange,
    }),
    ...(body.includeDeleted !== true && { deleted_at: null }),
  };
  // Determine sort order
  const sortDirection = body.sortOrder ?? "desc";
  const orderBy: Prisma.ecommerce_mall_adminsOrderByWithRelationInput =
    body.sortBy === "grade"
      ? { grade: sortDirection }
      : body.sortBy === "status"
        ? { status: sortDirection }
        : { created_at: sortDirection };
  const limit = body.limit ?? 20;
  // Count total records
  const total = await MyGlobal.prisma.ecommerce_mall_admins.count({ where });
  // Determine pagination mode: cursor-based takes precedence
  const hasValidCursor =
    body.cursor !== undefined && body.cursor !== null && body.cursor !== "";
  let records: Array<
    Prisma.ecommerce_mall_adminsGetPayload<
      ReturnType<typeof EcommerceMallAdminAtSummaryTransformer.select>
    >
  >;
  let currentPage: number;
  if (hasValidCursor) {
    // Cursor-based pagination: fetch records after the cursor
    records = await MyGlobal.prisma.ecommerce_mall_admins.findMany({
      where,
      ...EcommerceMallAdminAtSummaryTransformer.select(),
      orderBy,
      take: limit,
      skip: 1,
      cursor: { id: body.cursor },
    });
    currentPage = 1;
  } else {
    // Page-based pagination
    const page = body.page ?? 1;
    const skip = (page - 1) * limit;
    records = await MyGlobal.prisma.ecommerce_mall_admins.findMany({
      where,
      ...EcommerceMallAdminAtSummaryTransformer.select(),
      orderBy,
      skip,
      take: limit,
    });
    currentPage = page;
  }
  // Transform records to DTO format
  const data = await ArrayUtil.asyncMap(
    records,
    EcommerceMallAdminAtSummaryTransformer.transform,
  );
  // Calculate total pages
  const pages = total > 0 ? Math.ceil(total / limit) : 0;
  return {
    pagination: {
      current: currentPage,
      limit,
      records: total,
      pages,
    },
    data,
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
// import { IEcommerceMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallAdmin";
// import { IPageIEcommerceMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEcommerceMallAdmin";
// import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
// 
// // DON'T CHANGE FUNCTION NAME AND PARAMETERS,
// // ONLY YOU HAVE TO WRITE THIS FUNCTION BODY, AND USE IMPORTED.
// export async function patchEcommerceMallAdminAdmins(props: {
//   admin: AdminPayload;
//   body: IEcommerceMallAdmin.IRequest;
// }): Promise<IPageIEcommerceMallAdmin.ISummary> {
//   const records = await MyGlobal.prisma.ecommerce_mall_admins.findMany({
//     ...EcommerceMallAdminAtSummaryTransformer.select(),
//     ...,
//   });
//   return {
//     pagination: {
//       current: ...,
//       limit: ...,
//       records: ...,
//       pages: ...,
//     },
//     data: await ArrayUtil.asyncMap(records, EcommerceMallAdminAtSummaryTransformer.transform),
//   };
// }
// ```
//--------------------------------------------------------------