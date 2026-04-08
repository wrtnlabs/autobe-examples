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

export async function putMallPlatformAdministratorCategoriesCategoryId(props: {
  administrator: AdministratorPayload;
  categoryId: string & tags.Format<"uuid">;
  body: IMallPlatformCategory.IUpdate;
}): Promise<IMallPlatformCategory> {
  if (props.administrator.type !== "administrator") {
    throw new HttpException("Forbidden", 403);
  }
  const updated = await MyGlobal.prisma.$transaction(async (prisma) => {
    const current = await prisma.mall_platform_categories.findUnique({
      where: { id: props.categoryId },
      select: {
        id: true,
        parent_category_id: true,
        deleted_at: true,
      },
    });
    if (current === null || current.deleted_at !== null) {
      throw new HttpException("Not Found", 404);
    }
    if (props.body.parentCategoryId !== undefined) {
      if (props.body.parentCategoryId === props.categoryId) {
        throw new HttpException("Invalid category hierarchy.", 422);
      }
      if (props.body.parentCategoryId !== null) {
        const parent = await prisma.mall_platform_categories.findUnique({
          where: { id: props.body.parentCategoryId },
          select: {
            id: true,
            parent_category_id: true,
            deleted_at: true,
          },
        });
        if (parent === null || parent.deleted_at !== null) {
          throw new HttpException("Invalid category hierarchy.", 422);
        }
        if (parent.parent_category_id !== null) {
          throw new HttpException("Invalid category hierarchy.", 422);
        }
      }
    }
    await prisma.mall_platform_categories.update({
      where: { id: props.categoryId },
      data: {
        ...(props.body.name !== undefined && { name: props.body.name }),
        ...(props.body.description !== undefined && {
          description: props.body.description,
        }),
        ...(props.body.parentCategoryId !== undefined && {
          parent_category_id: props.body.parentCategoryId,
        }),
        updated_at: new Date(),
      },
    });
    return await prisma.mall_platform_categories.findUniqueOrThrow({
      where: { id: props.categoryId },
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
// export async function putMallPlatformAdministratorCategoriesCategoryId(props: {
//   administrator: AdministratorPayload;
//   categoryId: string & tags.Format<"uuid">;
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