import { IEcommerceMall } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMall";
import { IEcommerceMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallAdmin";
import { IEcommerceMallAdminPromotion } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallAdminPromotion";
import { IEcommerceMallSuperAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSuperAdmin";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageIEcommerceMall } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEcommerceMall";
import { IPageIEcommerceMallAdminPromotion } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEcommerceMallAdminPromotion";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { SuperadminPayload } from "../decorators/payload/SuperadminPayload";
import { EcommerceMallAdminPromotionAtSummaryTransformer } from "../transformers/EcommerceMallAdminPromotionAtSummaryTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchEcommerceMallSuperAdminSuperAdminAdminPromotions(props: {
  superAdmin: SuperadminPayload;
  body: IEcommerceMallAdminPromotion.IRequest;
}): Promise<IPageIEcommerceMallAdminPromotion.ISummary> {
  const page = props.body.page ?? 1;
  const limit = props.body.limit ?? 20;
  const skip = (page - 1) * limit;
  const whereInput = {
    ...(props.body.adminId !== undefined && { admin_id: props.body.adminId }),
    ...(props.body.action !== undefined && { action: props.body.action }),
    ...(props.body.performedBySuperAdminId !== undefined && {
      performed_by_super_admin_id: props.body.performedBySuperAdminId,
    }),
    ...(props.body.createdAtFrom !== undefined && {
      created_at: { gte: new Date(props.body.createdAtFrom) },
    }),
    ...(props.body.createdAtTo !== undefined && {
      created_at: {
        ...(props.body.createdAtFrom !== undefined
          ? { gte: new Date(props.body.createdAtFrom) }
          : {}),
        lte: new Date(props.body.createdAtTo),
      },
    }),
  } satisfies Prisma.ecommerce_mall_admin_promotionsWhereInput;
  const records =
    await MyGlobal.prisma.ecommerce_mall_admin_promotions.findMany({
      ...EcommerceMallAdminPromotionAtSummaryTransformer.select(),
      where: whereInput,
      skip,
      take: limit,
      orderBy: { created_at: "desc" },
    });
  const total = await MyGlobal.prisma.ecommerce_mall_admin_promotions.count({
    where: whereInput,
  });
  return {
    pagination: {
      pagination: {
        current: page,
        limit: limit,
        records: total,
        pages: Math.ceil(total / limit),
      } satisfies IPage.IPagination,
      data: [],
    } satisfies IPageIEcommerceMall.IPagination,
    data: await ArrayUtil.asyncMap(
      records,
      EcommerceMallAdminPromotionAtSummaryTransformer.transform,
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
// import { IEcommerceMallAdminPromotion } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallAdminPromotion";
// import { IPageIEcommerceMallAdminPromotion } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEcommerceMallAdminPromotion";
// import { IPageIEcommerceMall } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEcommerceMall";
// import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
// import { IEcommerceMall } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMall";
// import { IEcommerceMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallAdmin";
// import { IEcommerceMallSuperAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSuperAdmin";
// 
// // DON'T CHANGE FUNCTION NAME AND PARAMETERS,
// // ONLY YOU HAVE TO WRITE THIS FUNCTION BODY, AND USE IMPORTED.
// export async function patchEcommerceMallSuperAdminSuperAdminAdminPromotions(props: {
//   superAdmin: SuperadminPayload;
//   body: IEcommerceMallAdminPromotion.IRequest;
// }): Promise<IPageIEcommerceMallAdminPromotion.ISummary> {
//   const records = await MyGlobal.prisma.ecommerce_mall_admin_promotions.findMany({
//     ...EcommerceMallAdminPromotionAtSummaryTransformer.select(),
//     ...,
//   });
//   return {
//     pagination: {
//       current: ...,
//       limit: ...,
//       records: ...,
//       pages: ...,
//     },
//     data: await ArrayUtil.asyncMap(records, EcommerceMallAdminPromotionAtSummaryTransformer.transform),
//   };
// }
// ```
//--------------------------------------------------------------