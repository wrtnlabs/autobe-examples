import { IEcommerceMallProductImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductImage";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { SellerPayload } from "../decorators/payload/SellerPayload";
import { EcommerceMallProductImageTransformer } from "../transformers/EcommerceMallProductImageTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchEcommerceMallSellerProductsProductIdImagesImageIdReorder(props: {
  seller: SellerPayload;
  productId: string & tags.Format<"uuid">;
  imageId: string & tags.Format<"uuid">;
  body: IEcommerceMallProductImage.IReorder;
}): Promise<IEcommerceMallProductImage> {
  const displayOrder = props.body.display_order;
  if (displayOrder < 1) {
    throw new HttpException("Display order must be at least 1", 422);
  }
  const image =
    await MyGlobal.prisma.ecommerce_mall_product_images.findFirstOrThrow({
      where: {
        id: props.imageId,
        product_id: props.productId,
        deleted_at: null,
      },
      ...EcommerceMallProductImageTransformer.select(),
    });
  const product =
    await MyGlobal.prisma.ecommerce_mall_products.findFirstOrThrow({
      where: {
        id: props.productId,
        seller_id: props.seller.id,
        deleted_at: null,
      },
      select: {
        id: true,
        name: true,
        description: true,
        base_price: true,
        created_at: true,
        updated_at: true,
        deleted_at: true,
        category_id: true,
      },
    });
  const existingImageWithOrder =
    await MyGlobal.prisma.ecommerce_mall_product_images.findFirst({
      where: {
        product_id: props.productId,
        display_order: displayOrder,
        id: {
          not: props.imageId,
        },
        deleted_at: null,
      },
    });
  if (existingImageWithOrder !== null) {
    throw new HttpException("Display order already in use", 409);
  }
  const updatedImage =
    await MyGlobal.prisma.ecommerce_mall_product_images.update({
      where: {
        id: props.imageId,
      },
      data: {
        display_order: displayOrder,
        updated_at: new Date(),
      },
      ...EcommerceMallProductImageTransformer.select(),
    });
  const allImages =
    await MyGlobal.prisma.ecommerce_mall_product_images.findMany({
      where: {
        product_id: props.productId,
        deleted_at: null,
      },
      orderBy: {
        display_order: "asc",
      },
    });
  const snapshotData: {
    product: {
      id: string & tags.Format<"uuid">;
      name: string;
      description: string;
      price: number;
      images: Array<{
        id: string & tags.Format<"uuid">;
        image_url: string;
        display_order: number;
      }>;
    };
  } = {
    product: {
      id: product.id,
      name: product.name,
      description: product.description ?? "",
      price: product.base_price,
      images: allImages.map((img) => ({
        id: img.id,
        image_url: img.image_url,
        display_order: img.display_order,
      })),
    },
  };
  await MyGlobal.prisma.ecommerce_mall_product_snapshots.create({
    data: {
      id: v4(),
      ecommerce_mall_product_id: props.productId,
      ecommerce_mall_seller_snapshot_id: v4(),
      ecommerce_mall_category_id: product.category_id,
      name: product.name,
      description: product.description,
      base_price: product.base_price,
      created_at: product.created_at,
      updated_at: product.updated_at,
      deleted_at: product.deleted_at,
    },
  });
  return await EcommerceMallProductImageTransformer.transform(updatedImage);
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
// import { IEcommerceMallProductImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductImage";
// 
// // DON'T CHANGE FUNCTION NAME AND PARAMETERS,
// // ONLY YOU HAVE TO WRITE THIS FUNCTION BODY, AND USE IMPORTED.
// export async function patchEcommerceMallSellerProductsProductIdImagesImageIdReorder(props: {
//   seller: SellerPayload;
//   productId: string & tags.Format<"uuid">;
//   imageId: string & tags.Format<"uuid">;
//   body: IEcommerceMallProductImage.IReorder;
// }): Promise<IEcommerceMallProductImage> {
//   const record = await MyGlobal.prisma.ecommerce_mall_product_images.findFirstOrThrow({
//     ...EcommerceMallProductImageTransformer.select(),
//     where: { ... },
//   });
//   return await EcommerceMallProductImageTransformer.transform(record);
// }
// ```
//--------------------------------------------------------------