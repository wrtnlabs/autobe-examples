import { IEcommerceMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCategory";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { GuestPayload } from "../decorators/payload/GuestPayload";
import { EcommerceMallCategoryAtTreeTransformer } from "../transformers/EcommerceMallCategoryAtTreeTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function getEcommerceMallGuestCategoriesTree(props: {
  guest: GuestPayload;
}): Promise<IEcommerceMallCategory.ITree[]> {
  const parentCategories =
    await MyGlobal.prisma.ecommerce_mall_categories.findMany({
      ...EcommerceMallCategoryAtTreeTransformer.select(),
      where: {
        parent_id: null,
        deleted_at: null,
      },
      orderBy: {
        name: "asc",
      },
    });
  return await EcommerceMallCategoryAtTreeTransformer.transformAll(
    parentCategories,
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
// import { IEcommerceMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCategory";
// 
// // DON'T CHANGE FUNCTION NAME AND PARAMETERS,
// // ONLY YOU HAVE TO WRITE THIS FUNCTION BODY, AND USE IMPORTED.
// export async function getEcommerceMallGuestCategoriesTree(props: {
//   guest: GuestPayload;
// }): Promise<IEcommerceMallCategory.ITree> {
//   const record = await MyGlobal.prisma.ecommerce_mall_categories.findFirstOrThrow({
//     ...EcommerceMallCategoryAtTreeTransformer.select(),
//     where: { ... },
//   });
//   return await EcommerceMallCategoryAtTreeTransformer.transform(record);
// }
// ```
//--------------------------------------------------------------