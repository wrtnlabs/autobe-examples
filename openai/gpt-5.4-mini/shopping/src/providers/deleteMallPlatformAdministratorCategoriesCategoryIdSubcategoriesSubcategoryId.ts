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

export async function deleteMallPlatformAdministratorCategoriesCategoryIdSubcategoriesSubcategoryId(props: {
  administrator: AdministratorPayload;
  categoryId: string & tags.Format<"uuid">;
  subcategoryId: string & tags.Format<"uuid">;
}): Promise<void> {
  await MyGlobal.prisma.$transaction(async (prisma) => {
    await prisma.mall_platform_administrators.findUniqueOrThrow({
      where: { id: props.administrator.id },
      select: { id: true },
    });
    const category = await prisma.mall_platform_categories.findUniqueOrThrow({
      where: { id: props.categoryId },
      select: { id: true },
    });
    const subcategory = await prisma.mall_platform_categories.findUnique({
      where: { id: props.subcategoryId },
      select: {
        id: true,
        parent_category_id: true,
      },
    });
    if (
      subcategory === null ||
      subcategory.parent_category_id !== category.id
    ) {
      throw new HttpException("Not Found", 404);
    }
    await prisma.mall_platform_categories.delete({
      where: { id: props.subcategoryId },
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
// export async function deleteMallPlatformAdministratorCategoriesCategoryIdSubcategoriesSubcategoryId(props: {
//   administrator: AdministratorPayload;
//   categoryId: string & tags.Format<"uuid">;
//   subcategoryId: string & tags.Format<"uuid">;
// }): Promise<void> {
//   await MyGlobal.prisma.....delete({
//     where: { ... },
//   });
// }
// ```
//--------------------------------------------------------------