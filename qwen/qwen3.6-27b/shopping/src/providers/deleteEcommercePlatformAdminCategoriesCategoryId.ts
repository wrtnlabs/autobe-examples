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

export async function deleteEcommercePlatformAdminCategoriesCategoryId(props: {
  admin: AdminPayload;
  categoryId: string & tags.Format<"uuid">;
}): Promise<void> {
  const category =
    await MyGlobal.prisma.ecommerce_platform_categories.findUniqueOrThrow({
      where: {
        id: props.categoryId,
      },
      select: {
        parent_ecommerce_platform_category_id: true,
        deleted_at: true,
      },
    });
  if (category.deleted_at !== null) {
    return;
  }
  await MyGlobal.prisma.$transaction(async (tx) => {
    if (category.parent_ecommerce_platform_category_id === null) {
      // Root category: soft-delete root and cascade to all active subcategories
      await tx.ecommerce_platform_categories.updateMany({
        where: {
          deleted_at: null,
          OR: [
            { id: props.categoryId },
            { parent_ecommerce_platform_category_id: props.categoryId },
          ],
        },
        data: {
          deleted_at: new Date(),
        },
      });
    } else {
      // Subcategory: soft-delete only this category
      await tx.ecommerce_platform_categories.update({
        where: {
          id: props.categoryId,
        },
        data: {
          deleted_at: new Date(),
        },
      });
    }
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
// export async function deleteEcommercePlatformAdminCategoriesCategoryId(props: {
//   admin: AdminPayload;
//   categoryId: string & tags.Format<"uuid">;
// }): Promise<void> {
//   await MyGlobal.prisma.....delete({
//     where: { ... },
//   });
// }
// ```
//--------------------------------------------------------------