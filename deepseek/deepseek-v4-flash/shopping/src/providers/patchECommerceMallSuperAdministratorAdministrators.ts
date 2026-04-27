import { IECommerceMallAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommerceMallAdministrator";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageIECommerceMallAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIECommerceMallAdministrator";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { SuperadministratorPayload } from "../decorators/payload/SuperadministratorPayload";
import { ECommerceMallAdministratorAtSummaryTransformer } from "../transformers/ECommerceMallAdministratorAtSummaryTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchECommerceMallSuperAdministratorAdministrators(props: {
  superAdministrator: SuperadministratorPayload;
  body: IECommerceMallAdministrator.IRequest;
}): Promise<IPageIECommerceMallAdministrator.ISummary> {
  const page = props.body.page ?? 1;
  const limit = props.body.limit ?? 100;
  const skip = (page - 1) * limit;
  const where: Prisma.e_commerce_mall_administratorsWhereInput = {
    deleted_at: null,
  };
  if (props.body.search) {
    where.email = {
      contains: props.body.search,
      mode: "insensitive",
    };
  }
  if (
    props.body.created_at_from !== undefined ||
    props.body.created_at_to !== undefined
  ) {
    const createdAtFilter: Prisma.DateTimeFilter = {};
    if (props.body.created_at_from !== undefined) {
      createdAtFilter.gte = props.body.created_at_from;
    }
    if (props.body.created_at_to !== undefined) {
      createdAtFilter.lte = props.body.created_at_to;
    }
    where.created_at = createdAtFilter;
  }
  if (props.body.grade === "regular") {
    where.superAdministrator = null;
  } else if (props.body.grade === "super") {
    where.NOT = { superAdministrator: null };
  }
  const sortField = props.body.sort_field ?? "created_at";
  const sortDirection =
    props.body.sort_direction ?? (sortField === "created_at" ? "desc" : "asc");
  const orderBy: Prisma.e_commerce_mall_administratorsOrderByWithRelationInput =
    {};
  if (sortField === "email") {
    orderBy.email = sortDirection;
  } else {
    orderBy.created_at = sortDirection;
  }
  const records = await MyGlobal.prisma.e_commerce_mall_administrators.findMany(
    {
      where,
      skip,
      take: limit,
      orderBy,
      ...ECommerceMallAdministratorAtSummaryTransformer.select(),
    },
  );
  const total = await MyGlobal.prisma.e_commerce_mall_administrators.count({
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
      ECommerceMallAdministratorAtSummaryTransformer.transform,
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
// import { IECommerceMallAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommerceMallAdministrator";
// import { IPageIECommerceMallAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIECommerceMallAdministrator";
// import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
// 
// // DON'T CHANGE FUNCTION NAME AND PARAMETERS,
// // ONLY YOU HAVE TO WRITE THIS FUNCTION BODY, AND USE IMPORTED.
// export async function patchECommerceMallSuperAdministratorAdministrators(props: {
//   superAdministrator: SuperadministratorPayload;
//   body: IECommerceMallAdministrator.IRequest;
// }): Promise<IPageIECommerceMallAdministrator.ISummary> {
//   const records = await MyGlobal.prisma.e_commerce_mall_administrators.findMany({
//     ...ECommerceMallAdministratorAtSummaryTransformer.select(),
//     ...,
//   });
//   return {
//     pagination: {
//       current: ...,
//       limit: ...,
//       records: ...,
//       pages: ...,
//     },
//     data: await ArrayUtil.asyncMap(records, ECommerceMallAdministratorAtSummaryTransformer.transform),
//   };
// }
// ```
//--------------------------------------------------------------