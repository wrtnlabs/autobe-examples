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

export async function deleteShoppingMallAdminCategoriesCategoryId(props: {
  admin: AdminPayload;
  categoryId: string & tags.Format<"uuid">;
}): Promise<void> {
  const category = await MyGlobal.prisma.shopping_mall_categories.findFirst({
    where: {
      id: props.categoryId,
      deleted_at: null,
    },
    select: {
      id: true,
      parent_id: true,
    },
  });
  if (category === null) {
    throw new HttpException("Category not found", 404);
  }
  await MyGlobal.prisma.$transaction(async (tx) => {
    const now = new Date();
    if (category.parent_id === null) {
      await tx.shopping_mall_categories.updateMany({
        where: {
          parent_id: props.categoryId,
          deleted_at: null,
        },
        data: {
          parent_id: null,
          updated_at: now,
        },
      });
    } else {
      await tx.shopping_mall_categories.updateMany({
        where: {
          parent_id: props.categoryId,
          deleted_at: null,
        },
        data: {
          parent_id: category.parent_id,
          updated_at: now,
        },
      });
    }
    await tx.shopping_mall_categories.update({
      where: { id: props.categoryId },
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
// export async function deleteShoppingMallAdminCategoriesCategoryId(props: {
//   admin: AdminPayload;
//   categoryId: string & tags.Format<"uuid">;
// }): Promise<void> {
//   await MyGlobal.prisma.....delete({
//     where: { ... },
//   });
// }
// ```
//--------------------------------------------------------------