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
  // Verify category exists and is not already deleted
  const category = await MyGlobal.prisma.ecommerce_mall_categories.findFirst({
    where: {
      id: props.categoryId,
      deleted_at: null,
    },
  });
  // If category not found or already deleted, throw 404
  if (category === null) {
    throw new HttpException("Not Found", 404);
  }
  // Get all subcategory IDs
  const subcategories =
    await MyGlobal.prisma.ecommerce_mall_categories.findMany({
      where: {
        parent_id: props.categoryId,
        deleted_at: null,
      },
      select: {
        id: true,
      },
    });
  const subcategoryIds = subcategories.map((sub) => sub.id);
  // Current timestamp as ISO string
  const now = new Date().toISOString() as string & tags.Format<"date-time">;
  // Execute deletion in a transaction
  await MyGlobal.prisma.$transaction(async (tx) => {
    // Step 1: Soft-delete all subcategories
    if (subcategoryIds.length > 0) {
      await tx.ecommerce_mall_categories.updateMany({
        where: {
          id: { in: subcategoryIds },
        },
        data: {
          deleted_at: now,
          updated_at: now,
        },
      });
    }
    // Step 2: Soft-delete the target category
    await tx.ecommerce_mall_categories.update({
      where: {
        id: props.categoryId,
      },
      data: {
        deleted_at: now,
        updated_at: now,
      },
    });
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