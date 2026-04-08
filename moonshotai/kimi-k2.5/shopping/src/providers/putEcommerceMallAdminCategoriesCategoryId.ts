import { IEcommerceMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCategory";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { AdminPayload } from "../decorators/payload/AdminPayload";
import { EcommerceMallCategoryTransformer } from "../transformers/EcommerceMallCategoryTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function putEcommerceMallAdminCategoriesCategoryId(props: {
  admin: AdminPayload;
  categoryId: string & tags.Format<"uuid">;
  body: IEcommerceMallCategory.IUpdate;
}): Promise<IEcommerceMallCategory> {
  // Verify category exists and is not soft-deleted
  const existing = await MyGlobal.prisma.ecommerce_mall_categories.findUnique({
    where: { id: props.categoryId },
    select: { id: true, parent_id: true, deleted_at: true },
  });
  if (existing === null || existing.deleted_at !== null) {
    throw new HttpException("Category not found", 404);
  }
  // Check name uniqueness if name is being updated
  if (props.body.name !== undefined) {
    const duplicate = await MyGlobal.prisma.ecommerce_mall_categories.findFirst(
      {
        where: {
          parent_id: existing.parent_id,
          name: {
            equals: props.body.name,
            mode: "insensitive",
          },
          id: { not: props.categoryId as string & tags.Format<"uuid"> },
          deleted_at: null,
        },
      },
    );
    if (duplicate !== null) {
      throw new HttpException(
        `Category name "${props.body.name}" already exists under the same parent`,
        409,
      );
    }
  }
  // Build update data - only include provided fields
  const updateData: {
    name?: string;
    description?: string | null;
    updated_at: string;
  } = {
    updated_at: new Date().toISOString(),
  };
  if (props.body.name !== undefined) {
    updateData.name = props.body.name;
  }
  if (props.body.description !== undefined) {
    updateData.description = props.body.description;
  }
  await MyGlobal.prisma.ecommerce_mall_categories.update({
    where: { id: props.categoryId },
    data: updateData,
  });
  const updated =
    await MyGlobal.prisma.ecommerce_mall_categories.findUniqueOrThrow({
      where: { id: props.categoryId },
      ...EcommerceMallCategoryTransformer.select(),
    });
  return await EcommerceMallCategoryTransformer.transform(updated);
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
// export async function putEcommerceMallAdminCategoriesCategoryId(props: {
//   admin: AdminPayload;
//   categoryId: string;
//   body: IEcommerceMallCategory.IUpdate;
// }): Promise<IEcommerceMallCategory> {
//   await MyGlobal.prisma.ecommerce_mall_categories.update({
//     where: { ... },
//     data: { ... },
//   });
//   const updated = await MyGlobal.prisma.ecommerce_mall_categories.findUniqueOrThrow({
//     where: { ... },
//     ...EcommerceMallCategoryTransformer.select(),
//   });
//   return await EcommerceMallCategoryTransformer.transform(updated);
// }
// ```
//--------------------------------------------------------------