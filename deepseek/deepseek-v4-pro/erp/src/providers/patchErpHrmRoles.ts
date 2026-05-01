import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IErpHrmRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmRole";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageIErpHrmRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIErpHrmRole";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { ErpHrmRoleAtSummaryTransformer } from "../transformers/ErpHrmRoleAtSummaryTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchErpHrmRoles(props: {
  body: IErpHrmRole.IRequest;
}): Promise<IPageIErpHrmRole.ISummary> {
  const body = props.body;
  const page = Math.max(1, body.page ?? 1);
  const limit = body.limit ?? 20;
  const skip = (page - 1) * limit;
  function resolveOrderBy(
    sort: typeof body.sort,
  ): Prisma.erp_hrm_rolesOrderByWithRelationInput {
    switch (sort) {
      case "name_desc":
        return { name: "desc" };
      case "created_at_asc":
        return { created_at: "asc" };
      case "created_at_desc":
        return { created_at: "desc" };
      default:
        return { name: "asc" };
    }
  }
  const orderBy = resolveOrderBy(body.sort);
  const trimmedSearch = body.search?.trim();
  const searchFilter: Prisma.erp_hrm_rolesWhereInput = trimmedSearch
    ? { name: { contains: trimmedSearch, mode: "insensitive" } }
    : {};
  const baseWhere: Prisma.erp_hrm_rolesWhereInput = {
    deleted_at: null,
    ...(body.is_builtin !== undefined ? { is_builtin: body.is_builtin } : {}),
    ...searchFilter,
  };
  const queryWhere: Prisma.erp_hrm_rolesWhereInput = body.cursor
    ? { ...baseWhere, created_at: { lt: body.cursor } }
    : baseWhere;
  const data = await MyGlobal.prisma.erp_hrm_roles.findMany({
    where: queryWhere,
    skip: body.cursor ? undefined : skip,
    take: limit,
    orderBy,
    ...ErpHrmRoleAtSummaryTransformer.select(),
  });
  const total = await MyGlobal.prisma.erp_hrm_roles.count({
    where: baseWhere,
  });
  return {
    data: await ArrayUtil.asyncMap(
      data,
      ErpHrmRoleAtSummaryTransformer.transform,
    ),
    pagination: {
      current: page,
      limit,
      records: total,
      pages: Math.ceil(total / limit),
    } satisfies IPage.IPagination,
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
// import { IErpHrmRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmRole";
// import { IPageIErpHrmRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIErpHrmRole";
// import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
// 
// // DON'T CHANGE FUNCTION NAME AND PARAMETERS,
// // ONLY YOU HAVE TO WRITE THIS FUNCTION BODY, AND USE IMPORTED.
// export async function patchErpHrmRoles(props: {
//   body: IErpHrmRole.IRequest;
// }): Promise<IPageIErpHrmRole.ISummary> {
//   const records = await MyGlobal.prisma.erp_hrm_roles.findMany({
//     ...ErpHrmRoleAtSummaryTransformer.select(),
//     ...,
//   });
//   return {
//     pagination: {
//       current: ...,
//       limit: ...,
//       records: ...,
//       pages: ...,
//     },
//     data: await ArrayUtil.asyncMap(records, ErpHrmRoleAtSummaryTransformer.transform),
//   };
// }
// ```
//--------------------------------------------------------------