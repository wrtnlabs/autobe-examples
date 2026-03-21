import { IEcommerceMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProduct";
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
}): Promise<IEcommerceMallProductImage[]> {
  // Step 1: Verify product exists and seller owns it
  const product =
    await MyGlobal.prisma.ecommerce_mall_products.findUniqueOrThrow({
      where: { id: props.productId },
      select: { id: true, ecommerce_mall_seller_id: true },
    });
  if (product.ecommerce_mall_seller_id !== props.seller.id) {
    throw new HttpException("Forbidden", 403);
  }
  // Step 2: Count existing images and validate limit
  const existingCount =
    await MyGlobal.prisma.ecommerce_mall_product_images.count({
      where: { product_id: props.productId },
    });
  const newImagesCount = props.body.imageUrls.length;
  if (existingCount + newImagesCount > 10) {
    throw new HttpException(
      existingCount >= 10
        ? "Maximum 10 images per product"
        : `Cannot add ${newImagesCount} images. Only ${10 - existingCount} slots remaining.`,
      400,
    );
  }
  // Step 3: Get max display_order for existing images
  const maxOrderResult =
    await MyGlobal.prisma.ecommerce_mall_product_images.aggregate({
      where: { product_id: props.productId },
      _max: { display_order: true },
    });
  const startOrder = (maxOrderResult._max.display_order ?? -1) + 1;
  // Step 4: Create images using collector and transformer
  const createdImageRecords: EcommerceMallProductImageTransformer.Payload[] =
    [];
  for (let i = 0; i < props.body.imageUrls.length; i++) {
    const image = await MyGlobal.prisma.ecommerce_mall_product_images.create({
      data: {
        id: v4() as string & tags.Format<"uuid">,
        image_url: props.body.imageUrls[i],
        display_order: startOrder + i,
        created_at: new Date(),
        updated_at: new Date(),
        product: { connect: { id: props.productId } },
      },
      ...EcommerceMallProductImageTransformer.select(),
    });
    createdImageRecords.push(image);
  }
  // Step 5: Transform and return all created images
  return ArrayUtil.asyncMap(
    createdImageRecords,
    EcommerceMallProductImageTransformer.transform,
  );
}
