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

export async function patchEcommerceMallSuperAdminAdminAdmins(props: {
  superAdmin: SuperadminPayload;
  body: IEcommerceMallAdmin.IRequest;
}): Promise<IPageIEcommerceMallAdmin.ISummary> {
  const page = props.body.page ?? (1 as const);
  const limit = props.body.limit ?? (20 as const);
  const skip = (page - 1) * limit;
  // Build status filter
  const statusCondition: Prisma.ecommerce_mall_adminsWhereInput | undefined =
    (() => {
      if (props.body.status === "active") {
        return { deleted_at: null };
      }
      if (props.body.status === "deleted") {
        return { deleted_at: { not: null } };
      }
      return undefined;
    })();
  // Build email filter (case-insensitive partial match)
  const emailCondition: Prisma.ecommerce_mall_adminsWhereInput | undefined =
    props.body.email
      ? { email: { contains: props.body.email, mode: "insensitive" } }
      : undefined;
  // Build name filter (case-insensitive partial match)
  const nameCondition: Prisma.ecommerce_mall_adminsWhereInput | undefined =
    props.body.name
      ? { name: { contains: props.body.name, mode: "insensitive" } }
      : undefined;
  // Build created_at range filters
  const createdAfterCondition:
    | Prisma.ecommerce_mall_adminsWhereInput
    | undefined = props.body.createdAfter
    ? { created_at: { gte: new Date(props.body.createdAfter) } }
    : undefined;
  const createdBeforeCondition:
    | Prisma.ecommerce_mall_adminsWhereInput
    | undefined = props.body.createdBefore
    ? { created_at: { lte: new Date(props.body.createdBefore) } }
    : undefined;
  // Compose WHERE clause with all conditions
  const conditions: Prisma.ecommerce_mall_adminsWhereInput[] = [
    statusCondition,
    emailCondition,
    nameCondition,
    createdAfterCondition,
    createdBeforeCondition,
  ].filter((c): c is Prisma.ecommerce_mall_adminsWhereInput => c !== undefined);
  const where: Prisma.ecommerce_mall_adminsWhereInput | undefined =
    conditions.length > 0 ? { AND: conditions } : undefined;
  // Determine sort field and direction
  const sortBy = props.body.sortBy ?? "created_at";
  const sortDir = props.body.sort ?? "desc";
  // Build orderBy based on sortBy
  const orderBy: Prisma.ecommerce_mall_adminsOrderByWithRelationInput = (() => {
    switch (sortBy) {
      case "email":
        return { email: sortDir };
      case "name":
        return { name: sortDir };
      case "created_at":
      default:
        return { created_at: sortDir };
    }
  })();
  // Execute queries sequentially
  const records = await MyGlobal.prisma.ecommerce_mall_admins.findMany({
    where,
    skip,
    take: limit,
    orderBy,
    ...EcommerceMallAdminAtSummaryTransformer.select(),
  });
  const total = await MyGlobal.prisma.ecommerce_mall_admins.count({ where });
  // Return paginated response
  return {
    pagination: {
      current: page,
      limit: limit,
      records: total,
      pages: Math.ceil(total / limit),
    } satisfies IPage.IPagination,
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
// export async function patchEcommerceMallSuperAdminAdminAdmins(props: {
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