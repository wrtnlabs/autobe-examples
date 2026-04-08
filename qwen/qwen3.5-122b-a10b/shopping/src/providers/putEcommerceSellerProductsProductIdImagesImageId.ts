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

export interface ISellerPayload {
  id: string & tags.Format<"uuid">;
  session_id: string & tags.Format<"uuid">;
  type: "seller";
}
export async function putEcommerceSellerProductsProductIdImagesImageId(props: {
  seller: SellerPayload;
  productId: string & tags.Format<"uuid">;
  imageId: string & tags.Format<"uuid">;
  body: IEcommerceProductImage.IUpdate;
}): Promise<IEcommerceProductImage> {
  // Verify image exists, belongs to product, and is not soft-deleted
  const image = await MyGlobal.prisma.ecommerce_product_images.findFirst({
    where: {
      id: props.imageId,
      ecommerce_product_id: props.productId,
      deleted_at: null,
    },
    select: {
      id: true,
      ecommerce_product_id: true,
    },
  });
  if (image === null) {
    throw new HttpException(
      "Image not found or does not belong to the specified product",
      404,
    );
  }
  // Verify parent product belongs to the authenticated seller
  const product = await MyGlobal.prisma.ecommerce_products.findFirst({
    where: {
      id: props.productId,
      seller_id: props.seller.id,
      deleted_at: null,
    },
    select: {
      id: true,
      seller_id: true,
    },
  });
  if (product === null) {
    throw new HttpException(
      "Product not found or does not belong to the seller",
      404,
    );
  }
  // Build update data with only provided fields
  const updateData: Prisma.ecommerce_product_imagesUpdateInput = {
    updated_at: new Date(),
  };
  if (props.body.image_url !== undefined) {
    updateData.image_url = props.body.image_url;
  }
  if (props.body.display_order !== undefined) {
    updateData.display_order = props.body.display_order;
  }
  // Update the image
  await MyGlobal.prisma.ecommerce_product_images.update({
    where: { id: props.imageId },
    data: updateData,
  });
  // Fetch updated record with transformer select
  const updated =
    await MyGlobal.prisma.ecommerce_product_images.findUniqueOrThrow({
      where: { id: props.imageId },
      ...EcommerceProductImageTransformer.select(),
    });
  // Transform and return
  return await EcommerceProductImageTransformer.transform(updated);
}
