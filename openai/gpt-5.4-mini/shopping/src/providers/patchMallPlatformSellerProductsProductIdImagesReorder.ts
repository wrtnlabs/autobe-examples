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
import { MallPlatformProductAtSummaryTransformer } from "../transformers/MallPlatformProductAtSummaryTransformer";
import { MallPlatformProductImageAtSummaryTransformer } from "../transformers/MallPlatformProductImageAtSummaryTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchMallPlatformSellerProductsProductIdImagesReorder(props: {
  seller: SellerPayload;
  productId: string & tags.Format<"uuid">;
  body: IMallPlatformProductImage.IUpdate;
}): Promise<IMallPlatformProductImage.ISummary> {
  const product =
    await MyGlobal.prisma.mall_platform_products.findUniqueOrThrow({
      where: { id: props.productId },
      select: {
        id: true,
        seller_account_id: true,
        deleted_at: true,
      },
    });
  if (product.seller_account_id !== props.seller.id) {
    throw new HttpException("Forbidden", 403);
  }
  if (product.deleted_at !== null) {
    throw new HttpException(
      "Product is unavailable for image maintenance",
      400,
    );
  }
  const images = await MyGlobal.prisma.mall_platform_product_images.findMany({
    where: {
      mall_platform_product_id: props.productId,
      deleted_at: null,
    },
    orderBy: {
      sort_order: "asc",
    },
    select: {
      id: true,
      mall_platform_product_id: true,
      image_url: true,
      sort_order: true,
      is_main: true,
      created_at: true,
      updated_at: true,
      deleted_at: true,
      product: MallPlatformProductAtSummaryTransformer.select(),
    },
  });
  if (images.length === 0) {
    throw new HttpException("No images found for product", 400);
  }
  const requestedIds = (
    props.body as {
      imageIds?: Array<string & tags.Format<"uuid">>;
    }
  ).imageIds;
  if (requestedIds === undefined || requestedIds.length !== images.length) {
    throw new HttpException("Invalid image ordering", 400);
  }
  const existingIds = new Set<string>(images.map((image) => image.id));
  const seenIds = new Set<string>();
  for (const imageId of requestedIds) {
    if (!existingIds.has(imageId)) {
      throw new HttpException("Invalid image ordering", 400);
    }
    if (seenIds.has(imageId)) {
      throw new HttpException("Invalid image ordering", 400);
    }
    seenIds.add(imageId);
  }
  if (seenIds.size !== existingIds.size) {
    throw new HttpException("Invalid image ordering", 400);
  }
  await MyGlobal.prisma.$transaction(async (prisma) => {
    for (let index = 0; index < requestedIds.length; index += 1) {
      await prisma.mall_platform_product_images.update({
        where: { id: requestedIds[index] },
        data: {
          sort_order: index,
          is_main: index === 0,
          updated_at: new Date(),
        },
      });
    }
  });
  const updated =
    await MyGlobal.prisma.mall_platform_product_images.findFirstOrThrow({
      where: {
        mall_platform_product_id: props.productId,
        deleted_at: null,
        is_main: true,
      },
      ...MallPlatformProductImageAtSummaryTransformer.select(),
    });
  return await MallPlatformProductImageAtSummaryTransformer.transform(updated);
}
