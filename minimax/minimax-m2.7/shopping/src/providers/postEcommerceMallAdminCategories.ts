import { IEcommerceMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCategory";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { EcommerceMallCategoryCollector } from "../collectors/EcommerceMallCategoryCollector";
import { AdminPayload } from "../decorators/payload/AdminPayload";
import { EcommerceMallCategoryTransformer } from "../transformers/EcommerceMallCategoryTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function postEcommerceMallAdminCategories(props: {
  admin: AdminPayload;
  body: IEcommerceMallCategory.ICreate;
}): Promise<IEcommerceMallCategory> {
  // Validate parent_id if provided - must exist, not deleted, and be top-level
  if (props.body.parent_id) {
    const parentCategory =
      await MyGlobal.prisma.ecommerce_mall_categories.findFirst({
        where: {
          id: props.body.parent_id,
          deleted_at: null,
        },
        select: {
          id: true,
          parent_id: true,
        },
      });
    if (!parentCategory) {
      throw new HttpException("Parent category not found", 404);
    }
    // Enforce one-level nesting: parent must be top-level (have null parent_id)
    if (parentCategory.parent_id !== null) {
      throw new HttpException(
        "Cannot create subcategory under a subcategory",
        400,
      );
    }
  }
  try {
    const record = await MyGlobal.prisma.ecommerce_mall_categories.create({
      data: await EcommerceMallCategoryCollector.collect({
        body: props.body,
      }),
      ...EcommerceMallCategoryTransformer.select(),
    });
    return await EcommerceMallCategoryTransformer.transform(record);
  } catch (error) {
    // Handle unique constraint violation (category name already exists in this scope)
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2002"
    ) {
      throw new HttpException(
        "Category name already exists in this scope",
        409,
      );
    }
    throw error;
  }
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
// export async function postEcommerceMallAdminCategories(props: {
//   admin: AdminPayload;
//   body: IEcommerceMallCategory.ICreate;
// }): Promise<IEcommerceMallCategory> {
//   const record = await MyGlobal.prisma.ecommerce_mall_categories.create({
//     data: await EcommerceMallCategoryCollector.collect({
//       body: props.body,
//       ...
//     }),
//     ...EcommerceMallCategoryTransformer.select(),
//   });
//   return await EcommerceMallCategoryTransformer.transform(record);
// }
// ```
//--------------------------------------------------------------