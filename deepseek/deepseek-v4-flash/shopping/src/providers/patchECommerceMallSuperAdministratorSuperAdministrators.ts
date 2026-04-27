import { IECommerceMallAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommerceMallAdministrator";
import { IECommerceMallSuperAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommerceMallSuperAdministrator";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageIECommerceMallSuperAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIECommerceMallSuperAdministrator";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { SuperadministratorPayload } from "../decorators/payload/SuperadministratorPayload";
import { ECommerceMallSuperAdministratorAtSummaryTransformer } from "../transformers/ECommerceMallSuperAdministratorAtSummaryTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchECommerceMallSuperAdministratorSuperAdministrators(props: {
  superAdministrator: SuperadministratorPayload;
  body: IECommerceMallSuperAdministrator.IRequest;
}): Promise<IPageIECommerceMallSuperAdministrator.ISummary> {
  const page = props.body.page ?? 1;
  const limit = props.body.limit ?? 100;
  const skip = (page - 1) * limit;
  const whereInput: Prisma.e_commerce_mall_super_administratorsWhereInput = {};
  if (props.body.search) {
    whereInput.email = { contains: props.body.search, mode: "insensitive" };
  }
  if (props.body.from_created_at || props.body.to_created_at) {
    whereInput.created_at = {};
    if (props.body.from_created_at) {
      whereInput.created_at.gte = props.body.from_created_at;
    }
    if (props.body.to_created_at) {
      whereInput.created_at.lte = props.body.to_created_at;
    }
  }
  if (!props.body.include_deleted) {
    whereInput.deleted_at = null;
  }
  const records =
    await MyGlobal.prisma.e_commerce_mall_super_administrators.findMany({
      where: whereInput,
      skip,
      take: limit,
      orderBy: { created_at: "desc" },
      ...ECommerceMallSuperAdministratorAtSummaryTransformer.select(),
    });
  const total =
    await MyGlobal.prisma.e_commerce_mall_super_administrators.count({
      where: whereInput,
    });
  return {
    data: await ArrayUtil.asyncMap(
      records,
      ECommerceMallSuperAdministratorAtSummaryTransformer.transform,
    ),
    pagination: {
      current: page,
      limit: limit,
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
// import { IECommerceMallSuperAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommerceMallSuperAdministrator";
// import { IPageIECommerceMallSuperAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIECommerceMallSuperAdministrator";
// import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
// import { IECommerceMallAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommerceMallAdministrator";
// 
// // DON'T CHANGE FUNCTION NAME AND PARAMETERS,
// // ONLY YOU HAVE TO WRITE THIS FUNCTION BODY, AND USE IMPORTED.
// export async function patchECommerceMallSuperAdministratorSuperAdministrators(props: {
//   superAdministrator: SuperadministratorPayload;
//   body: IECommerceMallSuperAdministrator.IRequest;
// }): Promise<IPageIECommerceMallSuperAdministrator.ISummary> {
//   const records = await MyGlobal.prisma.e_commerce_mall_super_administrators.findMany({
//     ...ECommerceMallSuperAdministratorAtSummaryTransformer.select(),
//     ...,
//   });
//   return {
//     pagination: {
//       current: ...,
//       limit: ...,
//       records: ...,
//       pages: ...,
//     },
//     data: await ArrayUtil.asyncMap(records, ECommerceMallSuperAdministratorAtSummaryTransformer.transform),
//   };
// }
// ```
//--------------------------------------------------------------