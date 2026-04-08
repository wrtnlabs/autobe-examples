import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IMallPlatformSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformSeller";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageIMallPlatformSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIMallPlatformSeller";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { AdministratorPayload } from "../decorators/payload/AdministratorPayload";
import { MallPlatformSellerAtSummaryTransformer } from "../transformers/MallPlatformSellerAtSummaryTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchMallPlatformAdministratorSellers(props: {
  administrator: AdministratorPayload;
  body: IMallPlatformSeller.IRequest;
}): Promise<IPageIMallPlatformSeller.ISummary> {
  const page = props.body.page ?? 1;
  const limit = props.body.limit ?? 20;
  const skip = (page - 1) * limit;
  const where: Prisma.mall_platform_sellersWhereInput = {
    deleted_at: null,
    ...(props.body.status !== undefined ? { status: props.body.status } : {}),
    ...(props.body.search !== undefined && props.body.search.length > 0
      ? {
          OR: [
            { email: { contains: props.body.search, mode: "insensitive" } },
            { status: { contains: props.body.search, mode: "insensitive" } },
            {
              rejection_reason: {
                contains: props.body.search,
                mode: "insensitive",
              },
            },
          ],
        }
      : {}),
  };
  const records = await MyGlobal.prisma.mall_platform_sellers.findMany({
    where,
    skip,
    take: limit,
    orderBy: [{ created_at: "desc" }, { id: "desc" }],
    ...MallPlatformSellerAtSummaryTransformer.select(),
  });
  const total = await MyGlobal.prisma.mall_platform_sellers.count({ where });
  return {
    pagination: {
      current: page,
      limit,
      records: total,
      pages: Math.ceil(total / limit),
    },
    data: await ArrayUtil.asyncMap(
      records,
      MallPlatformSellerAtSummaryTransformer.transform,
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
// import { IMallPlatformSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformSeller";
// import { IPageIMallPlatformSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIMallPlatformSeller";
// import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
// 
// // DON'T CHANGE FUNCTION NAME AND PARAMETERS,
// // ONLY YOU HAVE TO WRITE THIS FUNCTION BODY, AND USE IMPORTED.
// export async function patchMallPlatformAdministratorSellers(props: {
//   administrator: AdministratorPayload;
//   body: IMallPlatformSeller.IRequest;
// }): Promise<IPageIMallPlatformSeller.ISummary> {
//   const records = await MyGlobal.prisma.mall_platform_sellers.findMany({
//     ...MallPlatformSellerAtSummaryTransformer.select(),
//     ...,
//   });
//   return {
//     pagination: {
//       current: ...,
//       limit: ...,
//       records: ...,
//       pages: ...,
//     },
//     data: await ArrayUtil.asyncMap(records, MallPlatformSellerAtSummaryTransformer.transform),
//   };
// }
// ```
//--------------------------------------------------------------