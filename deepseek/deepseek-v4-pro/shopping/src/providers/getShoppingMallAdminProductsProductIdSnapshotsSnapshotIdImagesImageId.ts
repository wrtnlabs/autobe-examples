import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IShoppingMallProductSnapshotImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductSnapshotImage";
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

export async function getShoppingMallAdminProductsProductIdSnapshotsSnapshotIdImagesImageId(props: {
  admin: AdminPayload;
  productId: string & tags.Format<"uuid">;
  snapshotId: string & tags.Format<"uuid">;
  imageId: string & tags.Format<"uuid">;
}): Promise<IShoppingMallProductSnapshotImage> {
  const record =
    await MyGlobal.prisma.shopping_mall_product_snapshot_images.findFirstOrThrow(
      {
        where: {
          id: props.imageId,
          shopping_mall_product_snapshot_id: props.snapshotId,
        },
        select: {
          id: true,
          image_url: true,
          display_order: true,
          created_at: true,
          snapshot: {
            select: {
              id: true,
              shopping_mall_product_id: true,
            },
          },
          originalImage: {
            select: {
              id: true,
            },
          },
        },
      },
    );
  if (record.snapshot.shopping_mall_product_id !== props.productId) {
    throw new HttpException("Not Found", 404);
  }
  return {
    id: record.id,
    shoppingMallProductSnapshotId: record.snapshot.id,
    shoppingMallProductImageId: record.originalImage?.id ?? null,
    imageUrl: record.image_url,
    displayOrder: record.display_order,
    createdAt: record.created_at.toISOString(),
  } satisfies IShoppingMallProductSnapshotImage;
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
// import { IShoppingMallProductSnapshotImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductSnapshotImage";
// 
// // DON'T CHANGE FUNCTION NAME AND PARAMETERS,
// // ONLY YOU HAVE TO WRITE THIS FUNCTION BODY, AND USE IMPORTED.
// export async function getShoppingMallAdminProductsProductIdSnapshotsSnapshotIdImagesImageId(props: {
//   admin: AdminPayload;
//   productId: string & tags.Format<"uuid">;
//   snapshotId: string & tags.Format<"uuid">;
//   imageId: string & tags.Format<"uuid">;
// }): Promise<IShoppingMallProductSnapshotImage> {
//   const record = await MyGlobal.prisma.shopping_mall_product_snapshot_images.findFirstOrThrow({
//     ...ShoppingMallProductSnapshotImageTransformer.select(),
//     where: { ... },
//   });
//   return await ShoppingMallProductSnapshotImageTransformer.transform(record);
// }
// ```
//--------------------------------------------------------------