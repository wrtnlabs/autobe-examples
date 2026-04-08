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
  // Validate parent category if provided
  if (props.body.parentId !== undefined && props.body.parentId !== null) {
    const parent = await MyGlobal.prisma.ecommerce_mall_categories.findUnique({
      where: { id: props.body.parentId },
    });
    if (parent === null) {
      throw new HttpException("Parent category does not exist", 400);
    }
    if (parent.deleted_at !== null) {
      throw new HttpException("Parent category is deleted", 400);
    }
    if (parent.parent_id !== null) {
      throw new HttpException(
        "Parent cannot be a subcategory - max 2 level hierarchy",
        400,
      );
    }
  }
  // Check for duplicate name (case-insensitive) within same scope
  const existing = await MyGlobal.prisma.ecommerce_mall_categories.findFirst({
    where: {
      parent_id: props.body.parentId ?? null,
      name: { equals: props.body.name, mode: "insensitive" },
      deleted_at: null,
    },
  });
  if (existing !== null) {
    throw new HttpException(
      "Category with same name already exists in this scope",
      409,
    );
  }
  // Create category using Collector pattern
  const record = await MyGlobal.prisma.ecommerce_mall_categories.create({
    data: await EcommerceMallCategoryCollector.collect({
      body: props.body,
    }),
    ...EcommerceMallCategoryTransformer.select(),
  });
  return await EcommerceMallCategoryTransformer.transform(record);
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