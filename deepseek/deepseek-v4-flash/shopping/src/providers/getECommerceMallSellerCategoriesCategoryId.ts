import { IECommerceMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommerceMallCategory";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { SellerPayload } from "../decorators/payload/SellerPayload";
import { ECommerceMallCategoryTransformer } from "../transformers/ECommerceMallCategoryTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function getECommerceMallSellerCategoriesCategoryId(props: {
  seller: SellerPayload;
  categoryId: string & tags.Format<"uuid">;
}): Promise<IECommerceMallCategory> {
  const record =
    await MyGlobal.prisma.e_commerce_mall_categories.findFirstOrThrow({
      where: {
        id: props.categoryId,
        deleted_at: null,
      },
      ...ECommerceMallCategoryTransformer.select(),
    });
  return await ECommerceMallCategoryTransformer.transform(record);
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
// import { IECommerceMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommerceMallCategory";
// 
// // DON'T CHANGE FUNCTION NAME AND PARAMETERS,
// // ONLY YOU HAVE TO WRITE THIS FUNCTION BODY, AND USE IMPORTED.
// export async function getECommerceMallSellerCategoriesCategoryId(props: {
//   seller: SellerPayload;
//   categoryId: string & tags.Format<"uuid">;
// }): Promise<IECommerceMallCategory> {
//   const record = await MyGlobal.prisma.e_commerce_mall_categories.findFirstOrThrow({
//     ...ECommerceMallCategoryTransformer.select(),
//     where: { ... },
//   });
//   return await ECommerceMallCategoryTransformer.transform(record);
// }
// ```
//--------------------------------------------------------------