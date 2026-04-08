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

export async function deleteEcommerceMallAdministratorCategoriesCategoryId(props: {
  administrator: AdministratorPayload;
  categoryId: string & tags.Format<"uuid">;
}): Promise<void> {
  const category =
    await MyGlobal.prisma.ecommerce_mall_categories.findUniqueOrThrow({
      where: { id: props.categoryId },
      select: {
        id: true,
        name: true,
        description: true,
        parent_id: true,
        deleted_at: true,
      },
    });
  if (category.deleted_at !== null) {
    throw new HttpException("Category is already deleted", 400);
  }
  await MyGlobal.prisma.ecommerce_mall_categories_snapshots.create({
    data: {
      id: v4() as string & tags.Format<"uuid">,
      category_id: category.id,
      parent_category_id: category.parent_id,
      modified_by_id: props.administrator.id,
      entity_type: "category",
      entity_id: category.id,
      name: category.name,
      description: category.description ?? "",
      created_at: toISOStringSafe(new Date()),
    },
  });
  await MyGlobal.prisma.ecommerce_mall_categories.update({
    where: { id: category.id },
    data: {
      deleted_at: toISOStringSafe(new Date()),
    },
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
// export async function deleteEcommerceMallAdministratorCategoriesCategoryId(props: {
//   administrator: AdministratorPayload;
//   categoryId: string & tags.Format<"uuid">;
// }): Promise<void> {
//   await MyGlobal.prisma.....delete({
//     where: { ... },
//   });
// }
// ```
//--------------------------------------------------------------