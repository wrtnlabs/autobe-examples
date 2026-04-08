import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IMallPlatformCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformCategory";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { CustomerPayload } from "../decorators/payload/CustomerPayload";
import { MallPlatformCategoryTransformer } from "../transformers/MallPlatformCategoryTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function getMallPlatformCustomerCategoriesCategoryId(props: {
  customer: CustomerPayload;
  categoryId: string & tags.Format<"uuid">;
}): Promise<IMallPlatformCategory> {
  const record =
    await MyGlobal.prisma.mall_platform_categories.findFirstOrThrow({
      ...MallPlatformCategoryTransformer.select(),
      where: {
        id: props.categoryId,
        deleted_at: null,
      },
    });
  return await MallPlatformCategoryTransformer.transform(record);
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
// import { IMallPlatformCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformCategory";
// 
// // DON'T CHANGE FUNCTION NAME AND PARAMETERS,
// // ONLY YOU HAVE TO WRITE THIS FUNCTION BODY, AND USE IMPORTED.
// export async function getMallPlatformCustomerCategoriesCategoryId(props: {
//   customer: CustomerPayload;
//   categoryId: string & tags.Format<"uuid">;
// }): Promise<IMallPlatformCategory> {
//   const record = await MyGlobal.prisma.mall_platform_categories.findFirstOrThrow({
//     ...MallPlatformCategoryTransformer.select(),
//     where: { ... },
//   });
//   return await MallPlatformCategoryTransformer.transform(record);
// }
// ```
//--------------------------------------------------------------