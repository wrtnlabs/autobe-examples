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
import { EcommerceMallProductImageAtSummaryTransformer } from "../transformers/EcommerceMallProductImageAtSummaryTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchEcommerceMallSellerProductsProductIdImages(props: {
  seller: SellerPayload;
  productId: string & tags.Format<"uuid">;
  body: IEcommerceMallProductImage.IReorder;
}): Promise<IEcommerceMallProductImage.ISummary[]> {
  const { seller, productId, body } = props;
  const reorderList = Array.isArray(body) ? body : [body];
  if (reorderList.length === 0) {
    throw new HttpException("At least one image must be reordered", 400);
  }
  const product =
    await MyGlobal.prisma.ecommerce_mall_products.findFirstOrThrow({
      where: {
        id: productId,
        seller_id: seller.id,
        deleted_at: null,
      },
      select: { id: true },
    });
  const activeImages =
    await MyGlobal.prisma.ecommerce_mall_product_images.findMany({
      where: {
        product_id: productId,
        deleted_at: null,
      },
      select: {
        id: true,
        display_order: true,
      },
    });
  const imageIdSet = new Set(reorderList.map((item) => item.id));
  const dbImageIdSet = new Set(activeImages.map((img) => img.id));
  for (const imageId of imageIdSet) {
    if (!dbImageIdSet.has(imageId)) {
      throw new HttpException(
        `Image ${imageId} does not belong to this product`,
        400,
      );
    }
  }
  const orders = reorderList.map((item) => item.display_order);
  const uniqueOrders = new Set(orders);
  if (uniqueOrders.size !== orders.length) {
    throw new HttpException("Display orders must be unique", 400);
  }
  const minOrder = Math.min(...orders);
  if (minOrder !== 1) {
    throw new HttpException("Display orders must start from 1", 400);
  }
  const maxOrder = Math.max(...orders);
  if (maxOrder !== reorderList.length) {
    throw new HttpException("Display orders must form sequence 1..n", 400);
  }
  const updatedImages = await MyGlobal.prisma.$transaction(async (tx) => {
    const updatePromises = reorderList.map((item) =>
      tx.ecommerce_mall_product_images.update({
        where: { id: item.id },
        data: {
          display_order: item.display_order,
          updated_at: new Date(),
        },
      }),
    );
    return await Promise.all(updatePromises);
  });
  const resultImages =
    await MyGlobal.prisma.ecommerce_mall_product_images.findMany({
      where: {
        product_id: productId,
        deleted_at: null,
      },
      ...EcommerceMallProductImageAtSummaryTransformer.select(),
      orderBy: { display_order: "asc" },
    });
  return await ArrayUtil.asyncMap(
    resultImages,
    EcommerceMallProductImageAtSummaryTransformer.transform,
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
// import { IEcommerceMallProductImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductImage";
// import { IEcommerceMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProduct";
// import { IEcommerceMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCategory";
// import { IEcommerceMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSeller";
// 
// // DON'T CHANGE FUNCTION NAME AND PARAMETERS,
// // ONLY YOU HAVE TO WRITE THIS FUNCTION BODY, AND USE IMPORTED.
// export async function patchEcommerceMallSellerProductsProductIdImages(props: {
//   seller: SellerPayload;
//   productId: string & tags.Format<"uuid">;
//   body: IEcommerceMallProductImage.IReorder;
// }): Promise<IEcommerceMallProductImage.ISummary> {
//   const record = await MyGlobal.prisma.ecommerce_mall_product_images.findFirstOrThrow({
//     ...EcommerceMallProductImageAtSummaryTransformer.select(),
//     where: { ... },
//   });
//   return await EcommerceMallProductImageAtSummaryTransformer.transform(record);
// }
// ```
//--------------------------------------------------------------