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

export async function postMallPlatformAdministratorCategories(props: {
  administrator: AdministratorPayload;
  body: IMallPlatformCategory.ICreate;
}): Promise<IMallPlatformCategory> {
  void props.administrator;
  if (
    props.body.parentCategoryId !== undefined &&
    props.body.parentCategoryId !== null
  ) {
    const parentCategory =
      await MyGlobal.prisma.mall_platform_categories.findUnique({
        where: {
          id: props.body.parentCategoryId,
        },
        select: {
          id: true,
          parent_category_id: true,
          deleted_at: true,
        },
      });
    if (parentCategory === null || parentCategory.deleted_at !== null) {
      throw new HttpException("Parent category not found", 404);
    }
    if (parentCategory.parent_category_id !== null) {
      throw new HttpException(
        "Category structure must remain one level deep",
        400,
      );
    }
  }
  const record = await MyGlobal.prisma.mall_platform_categories.create({
    data: await MallPlatformCategoryCollector.collect({
      body: props.body,
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
// export async function postMallPlatformAdministratorCategories(props: {
//   administrator: AdministratorPayload;
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