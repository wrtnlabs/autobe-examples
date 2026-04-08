import { IEcommerceMallSuperAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSuperAdmin";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageIEcommerceMallSuperAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEcommerceMallSuperAdmin";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { SuperadminPayload } from "../decorators/payload/SuperadminPayload";
import { EcommerceMallSuperAdminAtSummaryTransformer } from "../transformers/EcommerceMallSuperAdminAtSummaryTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchEcommerceMallSuperAdminSuperAdminSuperAdmins(props: {
  superAdmin: SuperadminPayload;
  body: IEcommerceMallSuperAdmin.IRequest;
}): Promise<IPageIEcommerceMallSuperAdmin.ISummary> {
  const page = props.body.page ?? 1;
  const limit = props.body.limit ?? 20;
  const take = Math.min(limit, 100);
  const skip = (page - 1) * take;
  // Build WHERE clause based on filters
  const whereConditions: Prisma.ecommerce_mall_super_adminsWhereInput[] = [];
  // Email filter - ILIKE for case-insensitive partial matching
  if (props.body.email) {
    whereConditions.push({
      email: {
        contains: props.body.email,
        mode: "insensitive",
      },
    });
  }
  // CreatedAt range filter
  if (props.body.createdAtFrom) {
    whereConditions.push({
      created_at: {
        gte: new Date(props.body.createdAtFrom),
      },
    });
  }
  if (props.body.createdAtTo) {
    whereConditions.push({
      created_at: {
        lte: new Date(props.body.createdAtTo),
      },
    });
  }
  // Status filter (active/deleted/includeDeleted)
  if (props.body.status === "active") {
    whereConditions.push({ deleted_at: null });
  } else if (props.body.status === "deleted") {
    whereConditions.push({ deleted_at: { not: null } });
  } else if (!props.body.includeDeleted) {
    // Default: only active accounts
    whereConditions.push({ deleted_at: null });
  }
  // If includeDeleted is true, no additional filter needed
  const whereInput =
    whereConditions.length > 0
      ? { AND: whereConditions }
      : (undefined satisfies
          | Prisma.ecommerce_mall_super_adminsWhereInput
          | undefined);
  // Sort order - default created_at DESC (Prisma SortOrder is lowercase)
  const orderByInput = (
    props.body.sort === "email"
      ? { email: (props.body.order ?? "ASC").toLowerCase() as "asc" | "desc" }
      : {
          created_at: (props.body.order ?? "DESC").toLowerCase() as
            | "asc"
            | "desc",
        }
  ) satisfies Prisma.ecommerce_mall_super_adminsOrderByWithRelationInput;
  // Execute queries sequentially (not parallel per guidelines)
  const data = await MyGlobal.prisma.ecommerce_mall_super_admins.findMany({
    ...EcommerceMallSuperAdminAtSummaryTransformer.select(),
    where: whereInput,
    orderBy: orderByInput,
    skip,
    take,
  });
  const total = await MyGlobal.prisma.ecommerce_mall_super_admins.count({
    where: whereInput,
  });
  return {
    pagination: {
      current: page,
      limit: take,
      records: total,
      pages: Math.ceil(total / take),
    } satisfies IPage.IPagination,
    data: await ArrayUtil.asyncMap(
      data as Parameters<
        typeof EcommerceMallSuperAdminAtSummaryTransformer.transform
      >[number][],
      EcommerceMallSuperAdminAtSummaryTransformer.transform,
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
// import { IEcommerceMallSuperAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSuperAdmin";
// import { IPageIEcommerceMallSuperAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEcommerceMallSuperAdmin";
// import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
// 
// // DON'T CHANGE FUNCTION NAME AND PARAMETERS,
// // ONLY YOU HAVE TO WRITE THIS FUNCTION BODY, AND USE IMPORTED.
// export async function patchEcommerceMallSuperAdminSuperAdminSuperAdmins(props: {
//   superAdmin: SuperadminPayload;
//   body: IEcommerceMallSuperAdmin.IRequest;
// }): Promise<IPageIEcommerceMallSuperAdmin.ISummary> {
//   const records = await MyGlobal.prisma.ecommerce_mall_super_admins.findMany({
//     ...EcommerceMallSuperAdminAtSummaryTransformer.select(),
//     ...,
//   });
//   return {
//     pagination: {
//       current: ...,
//       limit: ...,
//       records: ...,
//       pages: ...,
//     },
//     data: await ArrayUtil.asyncMap(records, EcommerceMallSuperAdminAtSummaryTransformer.transform),
//   };
// }
// ```
//--------------------------------------------------------------