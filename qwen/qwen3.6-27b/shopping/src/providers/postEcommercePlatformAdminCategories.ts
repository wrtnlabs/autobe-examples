import { IEcommercePlatformCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommercePlatformCategory";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { EcommercePlatformCategoryCollector } from "../collectors/EcommercePlatformCategoryCollector";
import { AdminPayload } from "../decorators/payload/AdminPayload";
import { EcommercePlatformCategoryTransformer } from "../transformers/EcommercePlatformCategoryTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function postEcommercePlatformAdminCategories(props: {
  admin: AdminPayload;
  body: IEcommercePlatformCategory.ICreate;
}): Promise<IEcommercePlatformCategory> {
  // Validate parent category if provided
  if (props.body.parentEcommercePlatformCategoryId != null) {
    const parent =
      await MyGlobal.prisma.ecommerce_platform_categories.findUniqueOrThrow({
        where: {
          id: props.body.parentEcommercePlatformCategoryId,
        },
        select: {
          id: true,
          parent_ecommerce_platform_category_id: true,
          deleted_at: true,
        },
      });
    // Parent must be active
    if (parent.deleted_at !== null) {
      throw new HttpException("Parent category isinactive", 400);
    }
    // Parent must be a root category (enforce 1-level nesting)
    if (parent.parent_ecommerce_platform_category_id !== null) {
      throw new HttpException("Nesting limit exceeded", 400);
    }
  }
  // Validate name uniqueness within same parent scope
  const existing =
    await MyGlobal.prisma.ecommerce_platform_categories.findFirst({
      where: {
        name: props.body.name,
        deleted_at: null,
        parent_ecommerce_platform_category_id:
          props.body.parentEcommercePlatformCategoryId ?? null,
      },
      select: {
        id: true,
      },
    });
  if (existing !== null) {
    throw new HttpException("Category name already exists", 400);
  }
  const record = await MyGlobal.prisma.ecommerce_platform_categories.create({
    data: await EcommercePlatformCategoryCollector.collect({
      body: props.body,
    }),
    ...EcommercePlatformCategoryTransformer.select(),
  } satisfies Prisma.ecommerce_platform_categoriesCreateArgs);
  return await EcommercePlatformCategoryTransformer.transform(record);
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
// export async function postEcommercePlatformAdminCategories(props: {
//   admin: AdminPayload;
//   body: IEcommercePlatformCategory.ICreate;
// }): Promise<IEcommercePlatformCategory> {
//   const record = await MyGlobal.prisma.ecommerce_platform_categories.create({
//     data: await EcommercePlatformCategoryCollector.collect({
//       body: props.body,
//       ...
//     }),
//     ...EcommercePlatformCategoryTransformer.select(),
//   });
//   return await EcommercePlatformCategoryTransformer.transform(record);
// }
// ```
//--------------------------------------------------------------