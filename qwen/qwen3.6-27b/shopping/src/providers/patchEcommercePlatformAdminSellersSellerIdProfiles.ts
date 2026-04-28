import { IEcommercePlatformSellerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommercePlatformSellerProfile";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageIEcommercePlatformSellerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEcommercePlatformSellerProfile";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { AdminPayload } from "../decorators/payload/AdminPayload";
import { EcommercePlatformSellerProfileAtSummaryTransformer } from "../transformers/EcommercePlatformSellerProfileAtSummaryTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchEcommercePlatformAdminSellersSellerIdProfiles(props: {
  admin: AdminPayload;
  sellerId: string & tags.Format<"uuid">;
  body: IEcommercePlatformSellerProfile.IRequest;
}): Promise<IPageIEcommercePlatformSellerProfile.ISummary> {
  await MyGlobal.prisma.ecommerce_platform_sellers.findUniqueOrThrow({
    where: { id: props.sellerId },
    select: { id: true },
  });
  const page = props.body.page ?? 1;
  const limit = props.body.limit ?? 100;
  const skip = (page - 1) * limit;
  const whereInput: Prisma.ecommerce_platform_seller_profilesWhereInput = {
    seller_id: props.sellerId,
    deleted_at: null,
  };
  if (props.body.shopName !== undefined) {
    whereInput.shop_name = { contains: props.body.shopName };
  }
  if (props.body.shopDescription !== undefined) {
    whereInput.shop_description = { contains: props.body.shopDescription };
  }
  if (props.body.logoImageUri !== undefined) {
    whereInput.logo_image_uri = { contains: props.body.logoImageUri };
  }
  if (props.body.search !== undefined) {
    whereInput.OR = [
      { shop_name: { contains: props.body.search } },
      { shop_description: { contains: props.body.search } },
    ];
  }
  if (
    props.body.createdAtFrom !== undefined ||
    props.body.createdAtTo !== undefined
  ) {
    whereInput.created_at = {
      ...(props.body.createdAtFrom !== undefined && {
        gte: props.body.createdAtFrom,
      }),
      ...(props.body.createdAtTo !== undefined && {
        lte: props.body.createdAtTo,
      }),
    };
  }
  if (
    props.body.updatedAtFrom !== undefined ||
    props.body.updatedAtTo !== undefined
  ) {
    whereInput.updated_at = {
      ...(props.body.updatedAtFrom !== undefined && {
        gte: props.body.updatedAtFrom,
      }),
      ...(props.body.updatedAtTo !== undefined && {
        lte: props.body.updatedAtTo,
      }),
    };
  }
  const records =
    await MyGlobal.prisma.ecommerce_platform_seller_profiles.findMany({
      where: whereInput,
      skip: skip,
      take: limit,
      orderBy: { created_at: "desc" },
      ...EcommercePlatformSellerProfileAtSummaryTransformer.select(),
    });
  const total = await MyGlobal.prisma.ecommerce_platform_seller_profiles.count({
    where: whereInput,
  });
  return {
    pagination: {
      current: page,
      limit: limit,
      records: total,
      pages: total === 0 ? 0 : Math.ceil(total / limit),
    },
    data: await ArrayUtil.asyncMap(
      records,
      EcommercePlatformSellerProfileAtSummaryTransformer.transform,
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
// import { IEcommercePlatformSellerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommercePlatformSellerProfile";
// import { IPageIEcommercePlatformSellerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEcommercePlatformSellerProfile";
// import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
// 
// // DON'T CHANGE FUNCTION NAME AND PARAMETERS,
// // ONLY YOU HAVE TO WRITE THIS FUNCTION BODY, AND USE IMPORTED.
// export async function patchEcommercePlatformAdminSellersSellerIdProfiles(props: {
//   admin: AdminPayload;
//   sellerId: string & tags.Format<"uuid">;
//   body: IEcommercePlatformSellerProfile.IRequest;
// }): Promise<IPageIEcommercePlatformSellerProfile.ISummary> {
//   const records = await MyGlobal.prisma.ecommerce_platform_seller_profiles.findMany({
//     ...EcommercePlatformSellerProfileAtSummaryTransformer.select(),
//     ...,
//   });
//   return {
//     pagination: {
//       current: ...,
//       limit: ...,
//       records: ...,
//       pages: ...,
//     },
//     data: await ArrayUtil.asyncMap(records, EcommercePlatformSellerProfileAtSummaryTransformer.transform),
//   };
// }
// ```
//--------------------------------------------------------------