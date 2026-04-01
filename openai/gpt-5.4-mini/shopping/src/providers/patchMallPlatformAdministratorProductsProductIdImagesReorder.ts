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
import { AdministratorPayload } from "../decorators/payload/AdministratorPayload";
import { MallPlatformProductImageAtSummaryTransformer } from "../transformers/MallPlatformProductImageAtSummaryTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchMallPlatformAdministratorProductsProductIdImagesReorder(props: {
  administrator: AdministratorPayload;
  productId: string & tags.Format<"uuid">;
  body: IMallPlatformProductImage.IUpdate;
}): Promise<IMallPlatformProductImage.ISummary> {
  const product =
    await MyGlobal.prisma.mall_platform_products.findUniqueOrThrow({
      where: { id: props.productId },
      select: {
        id: true,
        deleted_at: true,
        sellerAccount: {
          select: {
            id: true,
            deleted_at: true,
          },
        },
        images: {
          select: {
            id: true,
            image_url: true,
            sort_order: true,
            is_main: true,
            created_at: true,
            updated_at: true,
            deleted_at: true,
          },
        },
      },
    });
  if (product.deleted_at !== null) {
    throw new HttpException(
      "Product is unavailable for image maintenance.",
      400,
    );
  }
  if (product.sellerAccount.deleted_at !== null) {
    throw new HttpException(
      "Product owner is unavailable for image maintenance.",
      400,
    );
  }
  if (props.administrator.type !== "administrator") {
    throw new HttpException("Forbidden", 403);
  }
  const request = props.body as {
    imageIds?: readonly string[];
  };
  if (request.imageIds === undefined || request.imageIds.length === 0) {
    throw new HttpException("Invalid image ordering.", 400);
  }
  const activeImages = product.images
    .filter((image) => image.deleted_at === null)
    .slice()
    .sort((left, right) => left.sort_order - right.sort_order);
  if (request.imageIds.length !== activeImages.length) {
    throw new HttpException("Invalid image ordering.", 400);
  }
  const existingIds = new Set<string>(activeImages.map((image) => image.id));
  const seen = new Set<string>();
  for (const imageId of request.imageIds) {
    if (!existingIds.has(imageId) || seen.has(imageId)) {
      throw new HttpException("Invalid image ordering.", 400);
    }
    seen.add(imageId);
  }
  if (seen.size !== existingIds.size) {
    throw new HttpException("Invalid image ordering.", 400);
  }
  const orderedImages = request.imageIds.map((imageId, index) => {
    const image = activeImages.find((entry) => entry.id === imageId);
    if (image === undefined) {
      throw new HttpException("Invalid image ordering.", 400);
    }
    return {
      id: image.id,
      sortOrder: index,
      isMain: index === 0,
    };
  });
  const snapshotTime = toISOStringSafe(new Date());
  const snapshotId = v4();
  await MyGlobal.prisma.$transaction(async (prisma) => {
    for (const image of orderedImages) {
      await prisma.mall_platform_product_images.update({
        where: { id: image.id },
        data: {
          sort_order: image.sortOrder,
          is_main: image.isMain,
          updated_at: new Date(snapshotTime),
        },
      });
    }
    await prisma.mall_platform_product_image_snapshots.create({
      data: {
        id: snapshotId,
        mall_platform_product_id: product.id,
        image_url: activeImages[0].image_url,
        image_order: 0,
        is_main: true,
        changed_at: new Date(snapshotTime),
        created_at: new Date(snapshotTime),
        updated_at: new Date(snapshotTime),
        deleted_at: null,
      },
    });
    for (const image of activeImages) {
      await prisma.mall_platform_product_image_snapshots.create({
        data: {
          id: v4(),
          mall_platform_product_id: product.id,
          image_url: image.image_url,
          image_order:
            orderedImages.find((entry) => entry.id === image.id)?.sortOrder ??
            image.sort_order,
          is_main:
            orderedImages.find((entry) => entry.id === image.id)?.isMain ??
            image.is_main,
          changed_at: new Date(snapshotTime),
          created_at: new Date(snapshotTime),
          updated_at: new Date(snapshotTime),
          deleted_at: null,
        },
      });
    }
  });
  const updated = await MyGlobal.prisma.mall_platform_product_images.findMany({
    where: {
      mall_platform_product_id: props.productId,
      deleted_at: null,
    },
    orderBy: {
      sort_order: "asc",
    },
    ...MallPlatformProductImageAtSummaryTransformer.select(),
  });
  return await ArrayUtil.asyncMap(
    updated,
    MallPlatformProductImageAtSummaryTransformer.transform,
  ).then((images) => images[0]);
}
