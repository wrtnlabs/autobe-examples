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
  productId: string;
  body: IEcommerceMallProductImage.IUpload;
}): Promise<IEcommerceMallProductImage[]> {
  const product =
    await MyGlobal.prisma.ecommerce_mall_products.findUniqueOrThrow({
      where: { id: props.productId as string & tags.Format<"uuid"> },
      select: { id: true, seller_id: true },
    });
  if (product.seller_id !== props.seller.id) {
    throw new HttpException("Forbidden", 403);
  }
  const existingImages =
    await MyGlobal.prisma.ecommerce_mall_product_images.findMany({
      where: {
        product_id: props.productId as string & tags.Format<"uuid">,
        deleted_at: null,
      },
      select: { sort_order: true },
      orderBy: { sort_order: "desc" },
      take: 1,
    });
  const nextSortOrder =
    existingImages.length > 0 ? existingImages[0].sort_order + 1 : 0;
  const createdImages = await ArrayUtil.asyncMap(
    props.body.files,
    async (file, index) => {
      const image = await MyGlobal.prisma.ecommerce_mall_product_images.create({
        data: {
          id: v4() as string & tags.Format<"uuid">,
          product_id: props.productId as string & tags.Format<"uuid">,
          image_url: file,
          sort_order: nextSortOrder + index,
          is_main: false,
          created_at: new Date(),
          updated_at: new Date(),
          deleted_at: null,
        },
        select: {
          id: true,
          image_url: true,
          sort_order: true,
          is_main: true,
          created_at: true,
          updated_at: true,
          deleted_at: true,
          product_id: true,
        },
      });
      return EcommerceMallProductImageTransformer.transform(image);
    },
  );
  return createdImages;
}
