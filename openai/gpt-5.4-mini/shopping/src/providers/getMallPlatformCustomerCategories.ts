import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IMallPlatformCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformCategory";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageIMallPlatformCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIMallPlatformCategory";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { CustomerPayload } from "../decorators/payload/CustomerPayload";
import { MallPlatformCategoryAtSummaryTransformer } from "../transformers/MallPlatformCategoryAtSummaryTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function getMallPlatformCustomerCategories(props: {
  customer: CustomerPayload;
}): Promise<IPageIMallPlatformCategory.ISummary> {
  void props.customer;
  const records = await MyGlobal.prisma.mall_platform_categories.findMany({
    where: {
      deleted_at: null,
    },
    orderBy: [
      {
        parentCategory: {
          id: "asc",
        },
      },
      {
        name: "asc",
      },
      {
        id: "asc",
      },
    ],
    ...MallPlatformCategoryAtSummaryTransformer.select(),
  });
  const browsable = records.filter((record) => record.parentCategory === null);
  const recordsCount = browsable.length;
  return {
    pagination: {
      current: 1,
      limit: recordsCount,
      records: recordsCount,
      pages: recordsCount === 0 ? 0 : 1,
    },
    data: await ArrayUtil.asyncMap(
      browsable,
      MallPlatformCategoryAtSummaryTransformer.transform,
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
// import { IPageIMallPlatformCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIMallPlatformCategory";
// import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
// import { IMallPlatformCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformCategory";
// 
// // DON'T CHANGE FUNCTION NAME AND PARAMETERS,
// // ONLY YOU HAVE TO WRITE THIS FUNCTION BODY, AND USE IMPORTED.
// export async function getMallPlatformCustomerCategories(props: {
//   customer: CustomerPayload;
// }): Promise<IPageIMallPlatformCategory.ISummary> {
//   const records = await MyGlobal.prisma.mall_platform_categories.findMany({
//     ...MallPlatformCategoryAtSummaryTransformer.select(),
//     ...,
//   });
//   return {
//     pagination: {
//       current: ...,
//       limit: ...,
//       records: ...,
//       pages: ...,
//     },
//     data: await MallPlatformCategoryAtSummaryTransformer.transformAll(records),
//   };
// }
// ```
//--------------------------------------------------------------