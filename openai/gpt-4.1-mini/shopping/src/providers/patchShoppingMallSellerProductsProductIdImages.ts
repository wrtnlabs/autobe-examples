import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageIShoppingMallProductImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallProductImage";
import { IShoppingMallProductImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductImage";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { SellerPayload } from "../decorators/payload/SellerPayload";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchShoppingMallSellerProductsProductIdImages(props: {
  seller: SellerPayload;
  productId: string & tags.Format<"uuid">;
  body: IShoppingMallProductImage.IRequest[];
}): Promise<IPageIShoppingMallProductImage.ISummary> {
  const product = await MyGlobal.prisma.shopping_mall_products.findUnique({
    where: { id: props.productId },
    select: { id: true, seller_id: true, deleted_at: true },
  });
  if (!product || product.deleted_at !== null) {
    throw new HttpException("Product not found", 404);
  }
  if (product.seller_id !== props.seller.id) {
    throw new HttpException("Forbidden", 403);
  }
  const currentTime = toISOStringSafe(new Date());
  const imageList: IShoppingMallProductImage.IRequest[] = Array.isArray(
    props.body,
  )
    ? props.body
    : [];
  const existingImages =
    await MyGlobal.prisma.shopping_mall_product_images.findMany({
      where: { shopping_mall_product_id: props.productId, deleted_at: null },
    });
  const inputImagesById = new Map<string, IShoppingMallProductImage.IRequest>(
    imageList
      .filter(
        (
          img: IShoppingMallProductImage.IRequest,
        ): img is IShoppingMallProductImage.IRequest & {
          id: string & tags.Format<"uuid">;
        } => typeof img.id === "string" && img.id.length > 0,
      )
      .map(
        (
          img: IShoppingMallProductImage.IRequest & {
            id: string & tags.Format<"uuid">;
          },
        ) => [img.id, img],
      ),
  );
  const imagesToUpdate = existingImages.filter((img) =>
    inputImagesById.has(img.id),
  );
  const imagesToDelete = existingImages.filter(
    (img) => !inputImagesById.has(img.id),
  );
  const imagesToCreate = imageList.filter((img) => img.id === undefined);
  await MyGlobal.prisma.$transaction(async (tx) => {
    for (const image of imagesToUpdate) {
      const inputImage = inputImagesById.get(image.id);
      if (
        inputImage !== undefined &&
        (inputImage.imageUrl !== image.image_url ||
          inputImage.displayOrder !== image.display_order)
      ) {
        await tx.shopping_mall_product_images.update({
          where: { id: image.id },
          data: {
            image_url: inputImage.imageUrl,
            display_order: inputImage.displayOrder,
            updated_at: currentTime,
          },
        });
      }
    }
    for (const image of imagesToDelete) {
      await tx.shopping_mall_product_images.update({
        where: { id: image.id },
        data: { deleted_at: currentTime },
      });
    }
    for (const inputImage of imagesToCreate) {
      await tx.shopping_mall_product_images.create({
        data: {
          id: v4() as unknown as string & tags.Format<"uuid">,
          shopping_mall_product_id: props.productId,
          image_url: inputImage.imageUrl,
          display_order: inputImage.displayOrder,
          created_at: currentTime,
          updated_at: currentTime,
          deleted_at: null,
        },
      });
    }
  });
  const page = (props.body as any).page ?? 1;
  const limit = (props.body as any).limit ?? 100;
  const skip = (page - 1) * limit;
  const images = await MyGlobal.prisma.shopping_mall_product_images.findMany({
    where: { shopping_mall_product_id: props.productId, deleted_at: null },
    orderBy: { display_order: "asc" },
    skip,
    take: limit,
  });
  const total = await MyGlobal.prisma.shopping_mall_product_images.count({
    where: { shopping_mall_product_id: props.productId, deleted_at: null },
  });
  return {
    data: images.map((img) => ({
      id: img.id,
      imageUrl: img.image_url,
      displayOrder: img.display_order,
      createdAt: toISOStringSafe(img.created_at),
      updatedAt: toISOStringSafe(img.updated_at),
      deletedAt:
        img.deleted_at !== null ? toISOStringSafe(img.deleted_at) : null,
    })),
    pagination: {
      current: page,
      limit: limit,
      records: total,
      pages: Math.ceil(total / limit),
    },
  } satisfies IPageIShoppingMallProductImage.ISummary;
}
