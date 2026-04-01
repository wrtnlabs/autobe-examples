import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IMallPlatformCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformCategory";
import { IMallPlatformProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformProduct";
import { IMallPlatformProductImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformProductImage";
import { IMallPlatformSellerAccount } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformSellerAccount";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { SellerPayload } from "../decorators/payload/SellerPayload";
import { MallPlatformProductImageTransformer } from "../transformers/MallPlatformProductImageTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function putMallPlatformSellerProductsProductIdImagesImageId(props: {
  seller: SellerPayload;
  productId: string & tags.Format<"uuid">;
  imageId: string & tags.Format<"uuid">;
  body: IMallPlatformProductImage.IUpdate;
}): Promise<IMallPlatformProductImage> {
  const product =
    await MyGlobal.prisma.mall_platform_products.findUniqueOrThrow({
      where: { id: props.productId },
      select: {
        id: true,
        deleted_at: true,
        seller_account_id: true,
      },
    });
  if (product.deleted_at !== null) throw new HttpException("Not Found", 404);
  if (product.seller_account_id !== props.seller.id)
    throw new HttpException("Forbidden", 403);
  const image =
    await MyGlobal.prisma.mall_platform_product_images.findUniqueOrThrow({
      where: { id: props.imageId },
      select: {
        id: true,
        mall_platform_product_id: true,
        image_url: true,
        sort_order: true,
        is_main: true,
        created_at: true,
        updated_at: true,
        deleted_at: true,
      },
    });
  if (image.mall_platform_product_id !== props.productId)
    throw new HttpException("Not Found", 404);
  if (image.deleted_at !== null) throw new HttpException("Not Found", 404);
  await MyGlobal.prisma.$transaction(async (prisma) => {
    await prisma.mall_platform_product_images.update({
      where: { id: props.imageId },
      data: {
        ...(props.body.imageUrl !== undefined
          ? { image_url: props.body.imageUrl }
          : {}),
        ...(props.body.sortOrder !== undefined
          ? { sort_order: props.body.sortOrder }
          : {}),
        ...(props.body.isMain !== undefined
          ? { is_main: props.body.isMain }
          : {}),
        updated_at: new Date(),
      },
    });
    if (props.body.sortOrder !== undefined) {
      const images = await prisma.mall_platform_product_images.findMany({
        where: {
          mall_platform_product_id: props.productId,
          deleted_at: null,
        },
        orderBy: [{ sort_order: "asc" }, { created_at: "asc" }, { id: "asc" }],
        select: {
          id: true,
        },
      });
      for (let index: number = 0; index < images.length; ++index) {
        await prisma.mall_platform_product_images.update({
          where: { id: images[index].id },
          data: {
            sort_order: index,
            is_main: index === 0,
            updated_at: new Date(),
          },
        });
      }
    }
  });
  const updated =
    await MyGlobal.prisma.mall_platform_product_images.findUniqueOrThrow({
      where: { id: props.imageId },
      ...MallPlatformProductImageTransformer.select(),
    });
  return await MallPlatformProductImageTransformer.transform(updated);
}
