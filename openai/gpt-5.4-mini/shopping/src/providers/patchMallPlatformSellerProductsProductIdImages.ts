import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IMallPlatformCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformCategory";
import { IMallPlatformProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformProduct";
import { IMallPlatformProductImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformProductImage";
import { IMallPlatformSellerAccount } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformSellerAccount";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageIMallPlatformProductImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIMallPlatformProductImage";
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

export async function patchMallPlatformSellerProductsProductIdImages(props: {
  seller: SellerPayload;
  productId: string & tags.Format<"uuid">;
  body: IMallPlatformProductImage.IRequest;
}): Promise<IPageIMallPlatformProductImage.ISummary> {
  const page: number = props.body.page ?? 1;
  const limit: number = props.body.limit ?? 100;
  const skip: number = (page - 1) * limit;
  const product =
    await MyGlobal.prisma.mall_platform_products.findUniqueOrThrow({
      where: { id: props.productId },
      select: {
        id: true,
        seller_account_id: true,
      },
    });
  if (product.seller_account_id !== props.seller.id) {
    throw new HttpException("Forbidden", 403);
  }
  await MyGlobal.prisma.$transaction(async (tx) => {
    const existingImages = await tx.mall_platform_product_images.findMany({
      where: { mall_platform_product_id: props.productId, deleted_at: null },
      orderBy: [{ sort_order: "asc" }, { created_at: "asc" }],
      select: {
        id: true,
        sort_order: true,
      },
    });
    const existingIds = new Set<string>(
      existingImages.map((image) => image.id),
    );
    if (props.body.removedImageIds !== undefined) {
      for (const imageId of props.body.removedImageIds) {
        if (!existingIds.has(imageId)) {
          throw new HttpException("Image not found", 404);
        }
      }
    }
    if (props.body.reorderedImageIds !== undefined) {
      for (const imageId of props.body.reorderedImageIds) {
        if (!existingIds.has(imageId)) {
          throw new HttpException("Image not found", 404);
        }
      }
    }
    if (props.body.removedImageIds !== undefined) {
      await tx.mall_platform_product_images.updateMany({
        where: {
          id: { in: props.body.removedImageIds },
          mall_platform_product_id: props.productId,
        },
        data: {
          deleted_at: new Date(),
          updated_at: new Date(),
        },
      });
    }
    if (props.body.images !== undefined && props.body.images.length > 0) {
      await tx.mall_platform_product_images.createMany({
        data: props.body.images.map((image) => ({
          id: v4(),
          mall_platform_product_id: props.productId,
          image_url: image.imageUrl,
          sort_order: image.sortOrder,
          is_main: image.isMain,
          created_at: new Date(),
          updated_at: new Date(),
          deleted_at: null,
        })),
      });
    }
    const maintainedImages = await tx.mall_platform_product_images.findMany({
      where: { mall_platform_product_id: props.productId, deleted_at: null },
      orderBy: [{ sort_order: "asc" }, { created_at: "asc" }],
      select: {
        id: true,
        image_url: true,
        sort_order: true,
        is_main: true,
        created_at: true,
        updated_at: true,
        deleted_at: true,
        mall_platform_product_id: true,
      },
    });
    if (maintainedImages.length === 0) {
      await tx.mall_platform_product_snapshots.create({
        data: {
          id: v4(),
          mall_platform_product_id: props.productId,
          snapshot_kind: "images",
          product_name: "",
          product_description: "",
          base_price: 0,
          image_count: 0,
          variant_count: 0,
          created_at: new Date(),
        },
      });
    } else {
      const firstImageId: string = maintainedImages[0].id;
      await tx.mall_platform_product_images.updateMany({
        where: {
          mall_platform_product_id: props.productId,
          deleted_at: null,
        },
        data: {
          is_main: false,
          updated_at: new Date(),
        },
      });
      await tx.mall_platform_product_images.update({
        where: { id: firstImageId },
        data: {
          is_main: true,
          updated_at: new Date(),
        },
      });
      await tx.mall_platform_product_snapshots.create({
        data: {
          id: v4(),
          mall_platform_product_id: props.productId,
          snapshot_kind: "images",
          product_name: "",
          product_description: "",
          base_price: 0,
          image_count: 0,
          variant_count: 0,
          created_at: new Date(),
        },
      });
    }
  });
  const total = await MyGlobal.prisma.mall_platform_product_images.count({
    where: { mall_platform_product_id: props.productId, deleted_at: null },
  });
  const data = await MyGlobal.prisma.mall_platform_product_images.findMany({
    where: { mall_platform_product_id: props.productId, deleted_at: null },
    orderBy: [
      { is_main: "desc" },
      { sort_order: "asc" },
      { created_at: "asc" },
    ],
    skip,
    take: limit,
    select: {
      id: true,
      image_url: true,
      sort_order: true,
      is_main: true,
      created_at: true,
      updated_at: true,
      deleted_at: true,
      mall_platform_product_id: true,
    },
  });
  return {
    pagination: {
      current: page,
      limit,
      records: total,
      pages: Math.ceil(total / limit),
    },
    data: data.map((image) => ({
      id: image.id,
      product: {
        id: props.productId,
        name: "",
        description: "",
        basePrice: 0,
        sellerAccount: {
          id: props.seller.id,
          email: "",
          approvalStatus: "",
          rejectionReason: null,
          suspendedAt: null,
          deletedAt: null,
          createdAt: "",
          updatedAt: "",
        },
        category: null,
        createdAt: "",
        updatedAt: "",
        deletedAt: null,
      },
      imageUrl: image.image_url,
      sortOrder: image.sort_order,
      isMain: image.is_main,
      createdAt: toISOStringSafe(image.created_at),
      updatedAt: toISOStringSafe(image.updated_at),
      deletedAt:
        image.deleted_at !== null ? toISOStringSafe(image.deleted_at) : null,
    })),
  };
}
