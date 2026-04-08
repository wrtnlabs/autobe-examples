import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { SellerPayload } from "../decorators/payload/SellerPayload";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function deleteShoppingMallSellerProductsProductIdImagesImageId(props: {
  seller: SellerPayload;
  productId: string & tags.Format<"uuid">;
  imageId: string & tags.Format<"uuid">;
}): Promise<void> {
  const product =
    await MyGlobal.prisma.shopping_mall_products.findUniqueOrThrow({
      where: {
        id: props.productId,
        shopping_mall_seller_id: props.seller.id,
        deleted_at: null,
      },
      select: {
        id: true,
        shopping_mall_seller_id: true,
      },
    });
  const image =
    await MyGlobal.prisma.shopping_mall_product_images.findUniqueOrThrow({
      where: {
        id: props.imageId,
        shopping_mall_product_id: props.productId,
        deleted_at: null,
      },
      select: {
        id: true,
        display_order: true,
      },
    });
  const remainingCount =
    await MyGlobal.prisma.shopping_mall_product_images.count({
      where: {
        shopping_mall_product_id: props.productId,
        deleted_at: null,
        id: {
          not: props.imageId,
        },
      },
    });
  if (remainingCount < 1) {
    throw new HttpException(
      "At least one image must remain on the product",
      400,
    );
  }
  const currentImages =
    await MyGlobal.prisma.shopping_mall_product_images.findMany({
      where: {
        shopping_mall_product_id: props.productId,
        deleted_at: null,
      },
      orderBy: {
        display_order: "asc",
      },
      select: {
        id: true,
      },
    });
  const imagesBefore = currentImages.map((img) => img.id).join(",");
  await MyGlobal.prisma.shopping_mall_product_images.update({
    where: {
      id: props.imageId,
    },
    data: {
      deleted_at: new Date(),
      updated_at: new Date(),
    },
  });
  const updatedImages =
    await MyGlobal.prisma.shopping_mall_product_images.findMany({
      where: {
        shopping_mall_product_id: props.productId,
        deleted_at: null,
      },
      orderBy: {
        display_order: "asc",
      },
      select: {
        id: true,
      },
    });
  const imagesAfter = updatedImages.map((img) => img.id).join(",");
  await MyGlobal.prisma.shopping_mall_product_snapshots.create({
    data: {
      id: v4() as unknown as string & tags.Format<"uuid">,
      shopping_mall_product_id: props.productId,
      shopping_mall_seller_id: props.seller.id,
      images_before: imagesBefore,
      images_after: imagesAfter,
      created_at: new Date(),
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
// export async function deleteShoppingMallSellerProductsProductIdImagesImageId(props: {
//   seller: SellerPayload;
//   productId: string & tags.Format<"uuid">;
//   imageId: string & tags.Format<"uuid">;
// }): Promise<void> {
//   await MyGlobal.prisma.....delete({
//     where: { ... },
//   });
// }
// ```
//--------------------------------------------------------------