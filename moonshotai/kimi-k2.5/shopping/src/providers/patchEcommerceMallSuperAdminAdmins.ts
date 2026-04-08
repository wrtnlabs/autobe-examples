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
import { SuperadminPayload } from "../decorators/payload/SuperadminPayload";
import { EcommerceMallAdminAtSummaryTransformer } from "../transformers/EcommerceMallAdminAtSummaryTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchEcommerceMallSuperAdminAdmins(props: {
  superAdmin: SuperadminPayload;
  body: IEcommerceMallAdmin.IRequest;
}): Promise<IPageIEcommerceMallAdmin.ISummary> {
  const page = props.body.page ?? 1;
  const limit = props.body.limit ?? 100;
  const skip = (page - 1) * limit;
  const whereInput: Prisma.ecommerce_mall_adminsWhereInput = {
    deleted_at: props.body.includeDeleted === true ? undefined : null,
  };
  if (props.body.grade !== null && props.body.grade !== undefined) {
    whereInput.grade = props.body.grade;
  }
  if (props.body.status !== null && props.body.status !== undefined) {
    whereInput.status = props.body.status;
  }
  if (props.body.search !== null && props.body.search !== undefined) {
    whereInput.nickname = {
      contains: props.body.search,
      mode: "insensitive",
    };
  }
  if (props.body.email !== null && props.body.email !== undefined) {
    whereInput.email = {
      contains: props.body.email,
      mode: "insensitive",
    };
  }
  const createdAtFilter: Prisma.DateTimeFilter = {};
  if (
    props.body.createdAtMin !== null &&
    props.body.createdAtMin !== undefined
  ) {
    createdAtFilter.gte = new Date(props.body.createdAtMin);
  }
  if (
    props.body.createdAtMax !== null &&
    props.body.createdAtMax !== undefined
  ) {
    createdAtFilter.lte = new Date(props.body.createdAtMax);
  }
  if (Object.keys(createdAtFilter).length > 0) {
    whereInput.created_at = createdAtFilter;
  }
  let orderByInput: Prisma.ecommerce_mall_adminsOrderByWithRelationInput;
  if (props.body.sortBy === "grade") {
    orderByInput = { grade: props.body.sortOrder ?? "desc" };
  } else if (props.body.sortBy === "status") {
    orderByInput = { status: props.body.sortOrder ?? "desc" };
  } else {
    orderByInput = { created_at: props.body.sortOrder ?? "desc" };
  }
  const useCursor =
    props.body.cursor !== null && props.body.cursor !== undefined;
  const records = await MyGlobal.prisma.ecommerce_mall_admins.findMany({
    where: whereInput,
    orderBy: orderByInput,
    skip: useCursor ? 1 : skip,
    take: limit,
    cursor: useCursor ? { id: props.body.cursor } : undefined,
    ...EcommerceMallAdminAtSummaryTransformer.select(),
  });
  const totalRecords = await MyGlobal.prisma.ecommerce_mall_admins.count({
    where: whereInput,
  });
  return {
    pagination: {
      current: page,
      limit: limit,
      records: totalRecords,
      pages: Math.ceil(totalRecords / limit),
    },
    data: await ArrayUtil.asyncMap(
      records,
      EcommerceMallAdminAtSummaryTransformer.transform,
    ),
  } satisfies IPageIEcommerceMallAdmin.ISummary;
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
// export async function patchEcommerceMallSuperAdminAdmins(props: {
//   superAdmin: SuperadminPayload;
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