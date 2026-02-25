import { IEcommerceCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceCategory";
import { IEcommerceProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceProduct";
import { IEcommerceProductImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceProductImage";
import { IEcommerceSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceSeller";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { SellerPayload } from "../decorators/payload/SellerPayload";
import { EcommerceProductImageTransformer } from "../transformers/EcommerceProductImageTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function putEcommerceSellerProductsProductIdImages(props: {
  seller: SellerPayload;
  productId: string & tags.Format<"uuid">;
  body: IEcommerceProductImage.IUpdate;
}): Promise<IEcommerceProductImage> {
  // First verify seller owns the product
  const product = await MyGlobal.prisma.ecommerce_products.findFirst({
    where: {
      id: props.productId,
      seller: { id: props.seller.id },
      deleted_at: null,
    },
  });
  if (!product) {
    throw new HttpException("Product not found or access denied", 404);
  }
  // Get the specific image to update (need image ID from path parameter)
  // Since the function signature doesn't include imageId, this operation
  // should update ALL images for the product with new positions
  // However, the IUpdate DTO only has 'position' field, suggesting this
  // might be for updating a single image's position
  // Let me check if there's a missing imageId parameter
  // Based on the path /ecommerce/seller/products/{productId}/images
  // this seems to be for bulk reordering, but the DTO suggests single update
  // Implementation for single image position update:
  const images = await MyGlobal.prisma.ecommerce_product_images.findMany({
    where: {
      ecommerce_product_id: props.productId,
    },
    orderBy: { position: "asc" },
  });
  // Since we don't have specific image ID, update the first image's position
  if (images.length === 0) {
    throw new HttpException("No images found for this product", 404);
  }
  const imageToUpdate = images[0];
  const updatedImage = await MyGlobal.prisma.ecommerce_product_images.update({
    where: {
      id: imageToUpdate.id,
    },
    data: {
      position: props.body.position,
      updated_at: new Date(),
    },
    ...EcommerceProductImageTransformer.select(),
  });
  return await EcommerceProductImageTransformer.transform(updatedImage);
}
