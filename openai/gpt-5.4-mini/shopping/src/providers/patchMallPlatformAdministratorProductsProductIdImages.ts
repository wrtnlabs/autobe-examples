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
import { AdministratorPayload } from "../decorators/payload/AdministratorPayload";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchMallPlatformAdministratorProductsProductIdImages(props: {
  administrator: AdministratorPayload;
  productId: string & tags.Format<"uuid">;
  body: IMallPlatformProductImage.IRequest;
}): Promise<IPageIMallPlatformProductImage.ISummary> {
  const page: number = Math.max(1, Math.trunc(props.body.page ?? 1));
  const limit: number = Math.max(1, Math.trunc(props.body.limit ?? 100));
  const product =
    await MyGlobal.prisma.mall_platform_products.findUniqueOrThrow({
      where: { id: props.productId },
      select: {
        id: true,
        seller_account_id: true,
        category_id: true,
        name: true,
        description: true,
        base_price: true,
        created_at: true,
        updated_at: true,
        deleted_at: true,
        sellerAccount: {
          select: {
            id: true,
            email: true,
            approval_status: true,
            rejection_reason: true,
            suspended_at: true,
            deleted_at: true,
            created_at: true,
            updated_at: true,
          },
        },
        category: {
          select: {
            id: true,
            parent_category_id: true,
            name: true,
            description: true,
            created_at: true,
            updated_at: true,
            deleted_at: true,
          },
        },
      },
    });
  if (product.deleted_at !== null)
    throw new HttpException("Product is unavailable", 400);
  if (product.seller_account_id !== props.administrator.id)
    throw new HttpException("Forbidden", 403);
  const existingImages =
    await MyGlobal.prisma.mall_platform_product_images.findMany({
      where: { mall_platform_product_id: props.productId, deleted_at: null },
      orderBy: [{ sort_order: "asc" }, { created_at: "asc" }],
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
  const existingById: Record<string, (typeof existingImages)[number]> = {};
  for (const image of existingImages) existingById[image.id] = image;
  if (props.body.reorderedImageIds !== undefined) {
    for (const imageId of props.body.reorderedImageIds) {
      if (existingById[imageId] === undefined)
        throw new HttpException("Image target unavailable", 400);
    }
  }
  if (props.body.removedImageIds !== undefined) {
    for (const imageId of props.body.removedImageIds) {
      if (existingById[imageId] === undefined)
        throw new HttpException("Image target unavailable", 400);
    }
  }
  const retainedOrderedIds: string[] =
    props.body.reorderedImageIds ?? existingImages.map((image) => image.id);
  const removedSet: ReadonlySet<string> = new Set<string>(
    props.body.removedImageIds ?? [],
  );
  const finalExistingIds: string[] = retainedOrderedIds.filter(
    (id) => removedSet.has(id) === false,
  );
  const newImageInputs: IMallPlatformProductImage.ICreate[] =
    props.body.images ?? [];
  await MyGlobal.prisma.$transaction(async (tx) => {
    if ((props.body.removedImageIds ?? []).length > 0) {
      await tx.mall_platform_product_images.deleteMany({
        where: {
          mall_platform_product_id: props.productId,
          id: { in: props.body.removedImageIds ?? [] },
        },
      });
    }
    if (props.body.reorderedImageIds !== undefined) {
      for (
        let index = 0;
        index < props.body.reorderedImageIds.length;
        index += 1
      ) {
        await tx.mall_platform_product_images.update({
          where: { id: props.body.reorderedImageIds[index] },
          data: {
            sort_order: index,
            is_main: index === 0,
            updated_at: new Date(),
          },
        });
      }
    }
    if (newImageInputs.length > 0) {
      const startIndex: number = finalExistingIds.length;
      for (let index = 0; index < newImageInputs.length; index += 1) {
        const input = newImageInputs[index];
        await tx.mall_platform_product_images.create({
          data: {
            id: v4(),
            mall_platform_product_id: props.productId,
            image_url: input.imageUrl,
            sort_order: startIndex + index,
            is_main: false,
            created_at: new Date(),
            updated_at: new Date(),
            deleted_at: null,
          },
        });
      }
    }
    const normalized = await tx.mall_platform_product_images.findMany({
      where: { mall_platform_product_id: props.productId, deleted_at: null },
      orderBy: [{ sort_order: "asc" }, { created_at: "asc" }],
      select: {
        id: true,
        image_url: true,
      },
    });
    for (let index = 0; index < normalized.length; index += 1) {
      await tx.mall_platform_product_images.update({
        where: { id: normalized[index].id },
        data: {
          sort_order: index,
          is_main: index === 0,
          updated_at: new Date(),
        },
      });
    }
    const snapshot = await tx.mall_platform_product_snapshots.create({
      data: {
        id: v4(),
        mall_platform_product_id: props.productId,
        snapshot_kind: "after",
        product_name: product.name,
        product_description: product.description,
        category_name: product.category?.name ?? null,
        base_price: product.base_price,
        main_image_uri: normalized[0]?.image_url ?? null,
        image_count: normalized.length,
        variant_count: 0,
        created_at: new Date(),
      },
      select: {
        id: true,
      },
    });
    for (let index = 0; index < normalized.length; index += 1) {
      await tx.mall_platform_product_snapshot_images.create({
        data: {
          id: v4(),
          mall_platform_product_snapshot_id: snapshot.id,
          image_uri: normalized[index].image_url,
          sort_order: index,
          created_at: new Date(),
        },
      });
    }
  });
  const images = await MyGlobal.prisma.mall_platform_product_images.findMany({
    where: { mall_platform_product_id: props.productId, deleted_at: null },
    orderBy: [{ sort_order: "asc" }, { created_at: "asc" }],
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
  const pageImages = images.slice(
    (page - 1) * limit,
    (page - 1) * limit + limit,
  );
  return {
    data: pageImages.map((image) => ({
      id: image.id,
      product: {
        id: product.id,
        name: product.name,
        description: product.description,
        basePrice: product.base_price,
        sellerAccount: {
          id: product.sellerAccount.id,
          email: product.sellerAccount.email,
          approvalStatus: product.sellerAccount.approval_status,
          rejectionReason: product.sellerAccount.rejection_reason,
          suspendedAt:
            product.sellerAccount.suspended_at?.toISOString() ?? null,
          deletedAt: product.sellerAccount.deleted_at?.toISOString() ?? null,
          createdAt: product.sellerAccount.created_at.toISOString(),
          updatedAt: product.sellerAccount.updated_at.toISOString(),
        },
        category:
          product.category === null
            ? null
            : {
                id: product.category.id,
                parentCategory: null,
                name: product.category.name,
                description: product.category.description,
                createdAt: product.category.created_at.toISOString(),
                updatedAt: product.category.updated_at.toISOString(),
                deletedAt: product.category.deleted_at?.toISOString() ?? null,
              },
        createdAt: product.created_at.toISOString(),
        updatedAt: product.updated_at.toISOString(),
        deletedAt: product.deleted_at?.toISOString() ?? null,
      },
      imageUrl: image.image_url,
      sortOrder: image.sort_order,
      isMain: image.is_main,
      createdAt: image.created_at.toISOString(),
      updatedAt: image.updated_at.toISOString(),
      deletedAt: image.deleted_at?.toISOString() ?? null,
    })),
    pagination: {
      current: page,
      limit,
      records: images.length,
      pages: Math.ceil(images.length / limit),
    },
  };
}
