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

export async function postEcommerceMallAdminAdminCategories(props: {
  admin: AdminPayload;
  body: IEcommerceMallCategory.ICreate;
}): Promise<IEcommerceMallCategory> {
  // Validate parent category if provided
  if (props.body.parent_id) {
    const parent = await MyGlobal.prisma.ecommerce_mall_categories.findFirst({
      where: {
        id: props.body.parent_id,
        deleted_at: null,
      },
      select: {
        id: true,
        parent_id: true,
      },
    });
    if (!parent) {
      throw new HttpException("Parent category not found", 404);
    }
    // Enforce one level of nesting: parent must be a top-level category
    if (parent.parent_id !== null) {
      throw new HttpException(
        "Cannot create a subcategory under another subcategory",
        400,
      );
    }
  }
  // Check unique name constraint within same parent scope
  const existingCategory =
    await MyGlobal.prisma.ecommerce_mall_categories.findFirst({
      where: {
        name: props.body.name,
        parent_id: props.body.parent_id ?? null,
        deleted_at: null,
      },
    });
  if (existingCategory) {
    throw new HttpException(
      `Category with name "${props.body.name}" already exists in this scope`,
      409,
    );
  }
  // Create the category using collector for write data
  const created = await MyGlobal.prisma.ecommerce_mall_categories.create({
    data: await EcommerceMallCategoryCollector.collect({
      body: props.body,
    }),
    ...EcommerceMallCategoryTransformer.select(),
  });
  // Transform and return the created category
  return await EcommerceMallCategoryTransformer.transform(created);
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
// export async function postEcommerceMallAdminAdminCategories(props: {
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