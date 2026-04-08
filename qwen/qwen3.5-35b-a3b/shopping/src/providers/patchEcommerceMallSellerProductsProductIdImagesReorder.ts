import { IEcommerceMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCategory";
import { IEcommerceMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProduct";
import { IEcommerceMallProductImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductImage";
import { IEcommerceMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSeller";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { SellerPayload } from "../decorators/payload/SellerPayload";
import { EcommerceMallProductImageAtReorderResponseTransformer } from "../transformers/EcommerceMallProductImageAtReorderResponseTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchEcommerceMallSellerProductsProductIdImagesReorder(props: {
  seller: SellerPayload;
  productId: string & tags.Format<"uuid">;
  body: IEcommerceMallProduct.IReorder;
}): Promise<IEcommerceMallProductImage.IReorderResponse> {
  if (props.body.image_ids.length === 0) {
    throw new HttpException("At least one image is required", 400);
  }
  const product =
    await MyGlobal.prisma.ecommerce_mall_products.findUniqueOrThrow({
      where: { id: props.productId },
      select: { id: true, seller_id: true, name: true },
    });
  if (product.seller_id !== props.seller.id) {
    throw new HttpException("Forbidden", 403);
  }
  const existingImages =
    await MyGlobal.prisma.ecommerce_mall_product_images.findMany({
      where: {
        product_id: props.productId,
        deleted_at: null,
      },
      select: { id: true },
    });
  const existingImageIds = new Set(existingImages.map((img) => img.id));
  for (const imageId of props.body.image_ids) {
    if (!existingImageIds.has(imageId)) {
      throw new HttpException(
        `Image ${imageId} does not belong to this product or has been deleted`,
        400,
      );
    }
  }
  const updatePromises = props.body.image_ids.map((imageId, index) =>
    MyGlobal.prisma.ecommerce_mall_product_images.update({
      where: { id: imageId },
      data: {
        display_order: index + 1,
        updated_at: new Date(),
      },
    }),
  );
  await Promise.all(updatePromises);
  await MyGlobal.prisma.ecommerce_mall_snapshots.create({
    data: {
      id: v4(),
      entity_type: "product",
      action: "image_reorder",
      entity_name: product.name,
      entity_status: null,
      metadata: null,
      product: { connect: { id: props.productId } },
      created_at: new Date(),
      updated_at: new Date(),
      deleted_at: null,
    },
  });
  const updatedImages =
    await MyGlobal.prisma.ecommerce_mall_product_images.findMany({
      where: {
        product_id: props.productId,
        deleted_at: null,
      },
      orderBy: { display_order: "asc" },
      ...EcommerceMallProductImageAtReorderResponseTransformer.select(),
    });
  return await EcommerceMallProductImageAtReorderResponseTransformer.transform(
    updatedImages,
  );
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
// import { IEcommerceMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProduct";
// import { IEcommerceMallProductImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductImage";
// import { IEcommerceMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCategory";
// import { IEcommerceMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSeller";
// 
// // DON'T CHANGE FUNCTION NAME AND PARAMETERS,
// // ONLY YOU HAVE TO WRITE THIS FUNCTION BODY, AND USE IMPORTED.
// export async function patchEcommerceMallSellerProductsProductIdImagesReorder(props: {
//   seller: SellerPayload;
//   productId: string & tags.Format<"uuid">;
//   body: IEcommerceMallProduct.IReorder;
// }): Promise<IEcommerceMallProductImage.IReorderResponse> {
//   const record = await MyGlobal.prisma.ecommerce_mall_product_images.findFirstOrThrow({
//     ...EcommerceMallProductImageAtReorderResponseTransformer.select(),
//     where: { ... },
//   });
//   return await EcommerceMallProductImageAtReorderResponseTransformer.transform(record);
// }
// ```
//--------------------------------------------------------------