import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { AdministratorPayload } from "../decorators/payload/AdministratorPayload";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function deleteECommerceMallAdministratorCategoriesCategoryId(props: {
  administrator: AdministratorPayload;
  categoryId: string & tags.Format<"uuid">;
}): Promise<void> {
  const category = await MyGlobal.prisma.e_commerce_mall_categories.findUnique({
    where: { id: props.categoryId },
    select: { id: true, parent_id: true, deleted_at: true },
  });
  if (category === null || category.deleted_at !== null) {
    throw new HttpException("Category not found", 404);
  }
  const now = new Date().toISOString();
  if (category.parent_id === null) {
    const subcategories =
      await MyGlobal.prisma.e_commerce_mall_categories.findMany({
        where: { parent_id: props.categoryId, deleted_at: null },
        select: { id: true },
      });
    const subcategoryIds = subcategories.map((s) => s.id);
    if (subcategoryIds.length > 0) {
      await MyGlobal.prisma.e_commerce_mall_categories.updateMany({
        where: { id: { in: subcategoryIds } },
        data: { deleted_at: now },
      });
      await MyGlobal.prisma.e_commerce_mall_products.updateMany({
        where: { category_id: { in: subcategoryIds } },
        data: { category_id: null },
      });
    }
  }
  await MyGlobal.prisma.e_commerce_mall_products.updateMany({
    where: { category_id: props.categoryId },
    data: { category_id: null },
  });
  await MyGlobal.prisma.e_commerce_mall_categories.update({
    where: { id: props.categoryId },
    data: { deleted_at: now },
  });
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
// 
// // DON'T CHANGE FUNCTION NAME AND PARAMETERS,
// // ONLY YOU HAVE TO WRITE THIS FUNCTION BODY, AND USE IMPORTED.
// export async function deleteECommerceMallAdministratorCategoriesCategoryId(props: {
//   administrator: AdministratorPayload;
//   categoryId: string & tags.Format<"uuid">;
// }): Promise<void> {
//   await MyGlobal.prisma.....delete({
//     where: { ... },
//   });
// }
// ```
//--------------------------------------------------------------