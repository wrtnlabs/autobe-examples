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

export async function postEcommerceMallSellerProductsProductIdImages(props: {
  seller: SellerPayload;
  productId: string & tags.Format<"uuid">;
  body: IEcommerceMallProductImage.ICreate;
}): Promise<IEcommerceMallProductImage> {
  // Verify product exists and seller owns it
  const product =
    await MyGlobal.prisma.ecommerce_mall_products.findUniqueOrThrow({
      where: { id: props.productId },
      select: { id: true, ecommerce_mall_seller_id: true },
    });
  // Authorization check: only product owner can upload images
  if (product.ecommerce_mall_seller_id !== props.seller.id) {
    throw new HttpException("Forbidden", 403);
  }
  // Check image count limit (max 10)
  const imageCount = await MyGlobal.prisma.ecommerce_mall_product_images.count({
    where: { product_id: props.productId },
  });
  if (imageCount >= 10) {
    throw new HttpException("Maximum of 10 images per product exceeded", 400);
  }
  // Determine display order
  let displayOrder: number;
  if (props.body.displayOrder !== undefined) {
    displayOrder = props.body.displayOrder;
  } else {
    const maxOrderResult =
      await MyGlobal.prisma.ecommerce_mall_product_images.aggregate({
        where: { product_id: props.productId },
        _max: { display_order: true },
      });
    displayOrder = (maxOrderResult._max.display_order ?? -1) + 1;
  }
  // Create image record using collector
  const record = await MyGlobal.prisma.ecommerce_mall_product_images.create({
    data: {
      id: v4(),
      image_url: props.body.imageUrl,
      display_order: displayOrder,
      created_at: new Date(),
      updated_at: new Date(),
      product: { connect: { id: props.productId } },
    },
    ...EcommerceMallProductImageTransformer.select(),
  });
  return await EcommerceMallProductImageTransformer.transform(record);
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
// export async function postEcommerceMallSellerProductsProductIdImages(props: {
//   seller: SellerPayload;
//   productId: string & tags.Format<"uuid">;
//   body: IEcommerceMallProductImage.ICreate;
// }): Promise<IEcommerceMallProductImage> {
//   const record = await MyGlobal.prisma.ecommerce_mall_product_images.create({
//     data: await EcommerceMallProductImageCollector.collect({
//       body: props.body,
//       ...
//     }),
//     ...EcommerceMallProductImageTransformer.select(),
//   });
//   return await EcommerceMallProductImageTransformer.transform(record);
// }
// ```
//--------------------------------------------------------------