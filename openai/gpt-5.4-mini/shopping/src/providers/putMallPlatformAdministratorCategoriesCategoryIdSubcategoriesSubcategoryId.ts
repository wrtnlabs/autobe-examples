import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IMallPlatformCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformCategory";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { AdministratorPayload } from "../decorators/payload/AdministratorPayload";
import { MallPlatformCategoryTransformer } from "../transformers/MallPlatformCategoryTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function putMallPlatformAdministratorCategoriesCategoryIdSubcategoriesSubcategoryId(props: {
  administrator: AdministratorPayload;
  categoryId: string & tags.Format<"uuid">;
  subcategoryId: string & tags.Format<"uuid">;
  body: IMallPlatformCategory.IUpdate;
}): Promise<IMallPlatformCategory> {
  const updated = await MyGlobal.prisma.$transaction(async (prisma) => {
    const parentCategory =
      await prisma.mall_platform_categories.findUniqueOrThrow({
        where: { id: props.categoryId },
        select: {
          id: true,
        },
      });
    const subcategory = await prisma.mall_platform_categories.findUniqueOrThrow(
      {
        where: { id: props.subcategoryId },
        select: {
          id: true,
          parent_category_id: true,
          name: true,
        },
      },
    );
    if (subcategory.parent_category_id !== parentCategory.id) {
      throw new HttpException("Subcategory not found", 404);
    }
    const nextParentCategoryId =
      props.body.parentCategoryId === undefined
        ? subcategory.parent_category_id
        : props.body.parentCategoryId;
    if (
      nextParentCategoryId !== props.categoryId &&
      nextParentCategoryId !== null
    ) {
      const nextParentCategory =
        await prisma.mall_platform_categories.findUniqueOrThrow({
          where: { id: nextParentCategoryId },
          select: {
            id: true,
            parent_category_id: true,
          },
        });
      if (nextParentCategory.parent_category_id !== null) {
        throw new HttpException("Invalid category hierarchy", 400);
      }
    }
    const nextName =
      props.body.name === undefined ? subcategory.name : props.body.name;
    const duplicate = await prisma.mall_platform_categories.findFirst({
      where: {
        NOT: {
          id: props.subcategoryId,
        },
        parent_category_id: nextParentCategoryId,
        name: nextName,
      },
      select: {
        id: true,
      },
    });
    if (duplicate !== null) {
      throw new HttpException(
        "Category name already exists under the same parent",
        400,
      );
    }
    await prisma.mall_platform_categories.update({
      where: { id: props.subcategoryId },
      data: {
        ...(props.body.name !== undefined && { name: props.body.name }),
        ...(props.body.description !== undefined && {
          description: props.body.description,
        }),
        ...(props.body.parentCategoryId !== undefined && {
          parent_category_id: props.body.parentCategoryId,
        }),
      },
    });
    return await prisma.mall_platform_categories.findUniqueOrThrow({
      where: { id: props.subcategoryId },
      ...MallPlatformCategoryTransformer.select(),
    });
  });
  return await MallPlatformCategoryTransformer.transform(updated);
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
// import { IMallPlatformCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformCategory";
// 
// // DON'T CHANGE FUNCTION NAME AND PARAMETERS,
// // ONLY YOU HAVE TO WRITE THIS FUNCTION BODY, AND USE IMPORTED.
// export async function putMallPlatformAdministratorCategoriesCategoryIdSubcategoriesSubcategoryId(props: {
//   administrator: AdministratorPayload;
//   categoryId: string & tags.Format<"uuid">;
//   subcategoryId: string & tags.Format<"uuid">;
//   body: IMallPlatformCategory.IUpdate;
// }): Promise<IMallPlatformCategory> {
//   await MyGlobal.prisma.mall_platform_categories.update({
//     where: { ... },
//     data: { ... },
//   });
//   const updated = await MyGlobal.prisma.mall_platform_categories.findUniqueOrThrow({
//     where: { ... },
//     ...MallPlatformCategoryTransformer.select(),
//   });
//   return await MallPlatformCategoryTransformer.transform(updated);
// }
// ```
//--------------------------------------------------------------