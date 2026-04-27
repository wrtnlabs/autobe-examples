import { IECommerceMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommerceMallCategory";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { SuperadministratorPayload } from "../decorators/payload/SuperadministratorPayload";
import { ECommerceMallCategoryTransformer } from "../transformers/ECommerceMallCategoryTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

// DON'T CHANGE FUNCTION NAME AND PARAMETERS,
// ONLY YOU HAVE TO WRITE THIS FUNCTION BODY, AND USE IMPORTED.
export async function putECommerceMallSuperAdministratorCategoriesCategoryId(props: {
  superAdministrator: SuperadministratorPayload;
  categoryId: string & tags.Format<"uuid">;
  body: IECommerceMallCategory.IUpdate;
}): Promise<IECommerceMallCategory> {
  // Verify the category exists and is not soft-deleted
  await MyGlobal.prisma.e_commerce_mall_categories.findFirstOrThrow({
    where: {
      id: props.categoryId,
      deleted_at: null,
    },
    select: {
      id: true,
    },
  });
  // Build update data: only name and/or description (parent_id is immutable)
  const updateData: Record<string, string> = {};
  if (props.body.name !== undefined) {
    updateData.name = props.body.name;
  }
  if (props.body.description !== undefined) {
    updateData.description = props.body.description;
  }
  await MyGlobal.prisma.e_commerce_mall_categories.update({
    where: { id: props.categoryId },
    data: {
      ...updateData,
      updated_at: new Date().toISOString(),
    },
  });
  // Re-fetch with full transformer projection (includes parent relation)
  const updated =
    await MyGlobal.prisma.e_commerce_mall_categories.findUniqueOrThrow({
      where: { id: props.categoryId },
      ...ECommerceMallCategoryTransformer.select(),
    });
  return await ECommerceMallCategoryTransformer.transform(updated);
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
// export async function putECommerceMallSuperAdministratorCategoriesCategoryId(props: {
//   superAdministrator: SuperadministratorPayload;
//   categoryId: string & tags.Format<"uuid">;
//   body: IECommerceMallCategory.IUpdate;
// }): Promise<IECommerceMallCategory> {
//   await MyGlobal.prisma.e_commerce_mall_categories.update({
//     where: { ... },
//     data: { ... },
//   });
//   const updated = await MyGlobal.prisma.e_commerce_mall_categories.findUniqueOrThrow({
//     where: { ... },
//     ...ECommerceMallCategoryTransformer.select(),
//   });
//   return await ECommerceMallCategoryTransformer.transform(updated);
// }
// ```
//--------------------------------------------------------------