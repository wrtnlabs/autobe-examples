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

export async function deleteShoppingMallAdminProductsProductId(props: {
  admin: AdminPayload;
  productId: string & tags.Format<"uuid">;
}): Promise<void> {
  await MyGlobal.prisma.shopping_mall_products.findUniqueOrThrow({
    where: {
      id: props.productId,
      deleted_at: null,
    },
    select: {
      id: true,
    },
  });
  const now = new Date().toISOString();
  await MyGlobal.prisma.$transaction([
    MyGlobal.prisma.shopping_mall_products.update({
      where: { id: props.productId, deleted_at: null },
      data: {
        deleted_at: now,
      },
      select: { id: true },
    }),
    MyGlobal.prisma.shopping_mall_product_variants.updateMany({
      where: {
        shopping_mall_product_id: props.productId,
        deleted_at: null,
      },
      data: {
        deleted_at: now,
      },
    }),
    MyGlobal.prisma.shopping_mall_inventory_records.deleteMany({
      where: {
        variant: {
          shopping_mall_product_id: props.productId,
        },
      },
    }),
    MyGlobal.prisma.shopping_mall_product_images.deleteMany({
      where: {
        shopping_mall_product_id: props.productId,
      },
    }),
    MyGlobal.prisma.shopping_mall_wishlist_items.deleteMany({
      where: {
        shopping_mall_product_id: props.productId,
      },
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
// export async function deleteShoppingMallAdminProductsProductId(props: {
//   admin: AdminPayload;
//   productId: string & tags.Format<"uuid">;
// }): Promise<void> {
//   await MyGlobal.prisma.....delete({
//     where: { ... },
//   });
// }
// ```
//--------------------------------------------------------------