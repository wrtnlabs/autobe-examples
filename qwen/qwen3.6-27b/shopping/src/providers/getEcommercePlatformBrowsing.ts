import { IEcommercePlatformCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommercePlatformCategory";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { EcommercePlatformCategoryAtBrowsingTransformer } from "../transformers/EcommercePlatformCategoryAtBrowsingTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function getEcommercePlatformBrowsing(): Promise<
  IEcommercePlatformCategory.IBrowsing[]
> {
  const records = await MyGlobal.prisma.ecommerce_platform_categories.findMany({
    ...EcommercePlatformCategoryAtBrowsingTransformer.select(),
    where: {
      parent_ecommerce_platform_category_id: null,
      deleted_at: null,
    },
    orderBy: {
      created_at: "desc",
    },
  });
  return await EcommercePlatformCategoryAtBrowsingTransformer.transformAll(
    records,
  );
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
// import { IEcommercePlatformCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommercePlatformCategory";
// 
// // DON'T CHANGE FUNCTION NAME AND PARAMETERS,
// // ONLY YOU HAVE TO WRITE THIS FUNCTION BODY, AND USE IMPORTED.
// export async function getEcommercePlatformBrowsing(): Promise<IEcommercePlatformCategory.IBrowsing> {
//   const record = await MyGlobal.prisma.ecommerce_platform_categories.findFirstOrThrow({
//     ...EcommercePlatformCategoryAtBrowsingTransformer.select(),
//     where: { ... },
//   });
//   return await EcommercePlatformCategoryAtBrowsingTransformer.transform(record);
// }
// ```
//--------------------------------------------------------------