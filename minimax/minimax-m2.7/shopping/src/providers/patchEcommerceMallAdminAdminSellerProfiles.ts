import { IEcommerceMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSeller";
import { IEcommerceMallSellerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSellerProfile";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageIEcommerceMallSellerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEcommerceMallSellerProfile";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { AdminPayload } from "../decorators/payload/AdminPayload";
import { EcommerceMallSellerProfileAtSummaryTransformer } from "../transformers/EcommerceMallSellerProfileAtSummaryTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchEcommerceMallAdminAdminSellerProfiles(props: {
  admin: AdminPayload;
  body: IEcommerceMallSellerProfile.IRequest;
}): Promise<IPageIEcommerceMallSellerProfile.ISummary> {
  const page = props.body.page ?? 1;
  const limit = props.body.limit ?? 100;
  const safeLimit = limit > 100 ? 100 : limit;
  const skip = (page - 1) * safeLimit;
  const whereInput: Prisma.ecommerce_mall_seller_profilesWhereInput = {
    deleted_at: null,
    seller: {
      deleted_at: null,
    },
  };
  if (props.body.approval_status !== undefined) {
    whereInput.seller = {
      ...(whereInput.seller as object),
      approval_status: props.body.approval_status,
    } satisfies Prisma.ecommerce_mall_sellersWhereInput;
  }
  if (props.body.search !== undefined) {
    whereInput.name = {
      contains: props.body.search,
      mode: "insensitive",
    };
  }
  if (props.body.from_date !== undefined && props.body.to_date !== undefined) {
    whereInput.created_at = {
      gte: new Date(props.body.from_date),
      lte: new Date(props.body.to_date),
    };
  } else if (props.body.from_date !== undefined) {
    whereInput.created_at = {
      gte: new Date(props.body.from_date),
    };
  } else if (props.body.to_date !== undefined) {
    whereInput.created_at = {
      lte: new Date(props.body.to_date),
    };
  }
  const records = await MyGlobal.prisma.ecommerce_mall_seller_profiles.findMany(
    {
      where: whereInput,
      orderBy: { created_at: "desc" },
      skip,
      take: safeLimit,
      ...EcommerceMallSellerProfileAtSummaryTransformer.select(),
    },
  );
  const total = await MyGlobal.prisma.ecommerce_mall_seller_profiles.count({
    where: whereInput,
  });
  return {
    pagination: {
      current: page,
      limit: safeLimit,
      records: total,
      pages: Math.ceil(total / safeLimit),
    } satisfies IPage.IPagination,
    data: await ArrayUtil.asyncMap(
      records,
      EcommerceMallSellerProfileAtSummaryTransformer.transform,
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
// import { IEcommerceMallSellerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSellerProfile";
// import { IPageIEcommerceMallSellerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEcommerceMallSellerProfile";
// import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
// import { IEcommerceMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSeller";
// 
// // DON'T CHANGE FUNCTION NAME AND PARAMETERS,
// // ONLY YOU HAVE TO WRITE THIS FUNCTION BODY, AND USE IMPORTED.
// export async function patchEcommerceMallAdminAdminSellerProfiles(props: {
//   admin: AdminPayload;
//   body: IEcommerceMallSellerProfile.IRequest;
// }): Promise<IPageIEcommerceMallSellerProfile.ISummary> {
//   const records = await MyGlobal.prisma.ecommerce_mall_seller_profiles.findMany({
//     ...EcommerceMallSellerProfileAtSummaryTransformer.select(),
//     ...,
//   });
//   return {
//     pagination: {
//       current: ...,
//       limit: ...,
//       records: ...,
//       pages: ...,
//     },
//     data: await ArrayUtil.asyncMap(records, EcommerceMallSellerProfileAtSummaryTransformer.transform),
//   };
// }
// ```
//--------------------------------------------------------------