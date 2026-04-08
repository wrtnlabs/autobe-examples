import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IMallPlatformCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformCategory";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { MallPlatformCategoryCollector } from "../collectors/MallPlatformCategoryCollector";
import { AdministratorPayload } from "../decorators/payload/AdministratorPayload";
import { MallPlatformCategoryTransformer } from "../transformers/MallPlatformCategoryTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function postMallPlatformAdministratorCategoriesCategoryIdSubcategories(props: {
  administrator: AdministratorPayload;
  categoryId: string & tags.Format<"uuid">;
  body: IMallPlatformCategory.ICreate;
}): Promise<IMallPlatformCategory> {
  const parent =
    await MyGlobal.prisma.mall_platform_categories.findUniqueOrThrow({
      where: { id: props.categoryId },
      select: {
        id: true,
        parent_category_id: true,
      },
    });
  if (parent.parent_category_id !== null) {
    throw new HttpException("Invalid category hierarchy", 400);
  }
  const record = await MyGlobal.prisma.mall_platform_categories.create({
    data: await MallPlatformCategoryCollector.collect({
      body: {
        ...props.body,
        parentCategoryId: props.categoryId,
      },
    }),
    ...MallPlatformCategoryTransformer.select(),
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
// export async function postMallPlatformAdministratorCategoriesCategoryIdSubcategories(props: {
//   administrator: AdministratorPayload;
//   categoryId: string & tags.Format<"uuid">;
//   body: IMallPlatformCategory.ICreate;
// }): Promise<IMallPlatformCategory> {
//   const record = await MyGlobal.prisma.mall_platform_categories.create({
//     data: await MallPlatformCategoryCollector.collect({
//       body: props.body,
//       ...
//     }),
//     ...MallPlatformCategoryTransformer.select(),
//   });
//   return await MallPlatformCategoryTransformer.transform(record);
// }
// ```
//--------------------------------------------------------------