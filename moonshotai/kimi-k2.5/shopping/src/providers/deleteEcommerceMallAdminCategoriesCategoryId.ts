import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { AdminPayload } from "../decorators/payload/AdminPayload";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function deleteEcommerceMallAdminCategoriesCategoryId(props: {
  admin: AdminPayload;
  categoryId: string & tags.Format<"uuid">;
}): Promise<void> {
  const now = toISOStringSafe(new Date());
  const category = await MyGlobal.prisma.ecommerce_mall_categories.findUnique({
    where: { id: props.categoryId },
    select: { id: true, deleted_at: true },
  });
  if (category === null || category.deleted_at !== null) {
    throw new HttpException("Category not found", 404);
  }
  const subcategories =
    await MyGlobal.prisma.ecommerce_mall_categories.findMany({
      where: {
        parent_id: props.categoryId,
        deleted_at: null,
      },
      select: { id: true },
    });
  const categoryIds: Array<string & tags.Format<"uuid">> = [
    props.categoryId,
    ...subcategories.map((s) => s.id),
  ];
  await MyGlobal.prisma.$transaction([
    MyGlobal.prisma.ecommerce_mall_categories.update({
      where: { id: props.categoryId },
      data: { deleted_at: now },
    }),
    MyGlobal.prisma.ecommerce_mall_categories.updateMany({
      where: {
        id: { in: subcategories.map((s) => s.id) },
        deleted_at: null,
      },
      data: { deleted_at: now },
    }),
    MyGlobal.prisma.ecommerce_mall_products.updateMany({
      where: {
        category_id: { in: categoryIds },
      },
      data: { category_id: null },
    }),
  ]);
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
// export async function deleteEcommerceMallAdminCategoriesCategoryId(props: {
//   admin: AdminPayload;
//   categoryId: string & tags.Format<"uuid">;
// }): Promise<void> {
//   await MyGlobal.prisma.....delete({
//     where: { ... },
//   });
// }
// ```
//--------------------------------------------------------------