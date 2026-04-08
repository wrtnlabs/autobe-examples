import { IEcommerceMallProductImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductImage";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { EcommerceMallProductImageAtSummaryTransformer } from "../transformers/EcommerceMallProductImageAtSummaryTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchEcommerceMallProductsProductIdImages(props: {
  productId: string;
  body: IEcommerceMallProductImage.IUpdateOrder;
}): Promise<IEcommerceMallProductImage.ISummary[]> {
  const { productId, body } = props;
  const { imageIds } = body;
  const existingImages =
    await MyGlobal.prisma.ecommerce_mall_product_images.findMany({
      where: {
        product_id: productId,
        deleted_at: null,
      },
      select: {
        id: true,
      },
      orderBy: {
        display_order: "asc",
      },
    });
  const existingIds = existingImages.map((img) => img.id);
  const requestIds = imageIds;
  if (existingIds.length !== requestIds.length) {
    throw new HttpException(
      "Invalid reorder request: number of images does not match",
      400,
    );
  }
  const existingSet = new Set(existingIds);
  for (const id of requestIds) {
    if (!existingSet.has(id)) {
      throw new HttpException(
        `Invalid reorder request: image ${id} does not belong to this product`,
        400,
      );
    }
  }
  if (new Set(requestIds).size !== requestIds.length) {
    throw new HttpException(
      "Invalid reorder request: duplicate image IDs found",
      400,
    );
  }
  await MyGlobal.prisma.$transaction(
    requestIds.map((id, index) =>
      MyGlobal.prisma.ecommerce_mall_product_images.update({
        where: {
          id,
        },
        data: {
          display_order: index,
          updated_at: new Date(),
        },
      }),
    ),
  );
  const updatedImages =
    await MyGlobal.prisma.ecommerce_mall_product_images.findMany({
      where: {
        product_id: productId,
        deleted_at: null,
      },
      orderBy: {
        display_order: "asc",
      },
      ...EcommerceMallProductImageAtSummaryTransformer.select(),
    });
  return await ArrayUtil.asyncMap(
    updatedImages,
    EcommerceMallProductImageAtSummaryTransformer.transform,
  );
}
