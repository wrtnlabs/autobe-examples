import { IEcommercePlatformCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommercePlatformCategory";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { AdminPayload } from "../decorators/payload/AdminPayload";
import { EcommercePlatformCategoryTransformer } from "../transformers/EcommercePlatformCategoryTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function putEcommercePlatformAdminCategoriesCategoryId(props: {
  admin: AdminPayload;
  categoryId: string & tags.Format<"uuid">;
  body: IEcommercePlatformCategory.IUpdate;
}): Promise<IEcommercePlatformCategory> {
  const existing =
    await MyGlobal.prisma.ecommerce_platform_categories.findUniqueOrThrow({
      where: {
        id: props.categoryId,
        deleted_at: null,
      },
      select: {
        id: true,
        name: true,
        description: true,
        parent_ecommerce_platform_category_id: true,
      },
    });
  if (props.body.name !== undefined) {
    const duplicate =
      await MyGlobal.prisma.ecommerce_platform_categories.findFirst({
        where: {
          name: props.body.name,
          parent_ecommerce_platform_category_id:
            existing.parent_ecommerce_platform_category_id,
          deleted_at: null,
          NOT: {
            id: props.categoryId,
          },
        },
        select: { id: true },
      });
    if (duplicate !== null) {
      throw new HttpException(
        "Category name already exists under this parent",
        409,
      );
    }
  }
  await MyGlobal.prisma.ecommerce_platform_categories.update({
    where: { id: props.categoryId },
    data: {
      ...(props.body.name !== undefined && { name: props.body.name }),
      ...(props.body.description !== undefined && {
        description: props.body.description,
      }),
    },
  });
  const updated =
    await MyGlobal.prisma.ecommerce_platform_categories.findUniqueOrThrow({
      where: { id: props.categoryId },
      ...EcommercePlatformCategoryTransformer.select(),
    });
  return await EcommercePlatformCategoryTransformer.transform(updated);
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
// import { IEcommercePlatformCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommercePlatformCategory";
// 
// // DON'T CHANGE FUNCTION NAME AND PARAMETERS,
// // ONLY YOU HAVE TO WRITE THIS FUNCTION BODY, AND USE IMPORTED.
// export async function putEcommercePlatformAdminCategoriesCategoryId(props: {
//   admin: AdminPayload;
//   categoryId: string & tags.Format<"uuid">;
//   body: IEcommercePlatformCategory.IUpdate;
// }): Promise<IEcommercePlatformCategory> {
//   await MyGlobal.prisma.ecommerce_platform_categories.update({
//     where: { ... },
//     data: { ... },
//   });
//   const updated = await MyGlobal.prisma.ecommerce_platform_categories.findUniqueOrThrow({
//     where: { ... },
//     ...EcommercePlatformCategoryTransformer.select(),
//   });
//   return await EcommercePlatformCategoryTransformer.transform(updated);
// }
// ```
//--------------------------------------------------------------