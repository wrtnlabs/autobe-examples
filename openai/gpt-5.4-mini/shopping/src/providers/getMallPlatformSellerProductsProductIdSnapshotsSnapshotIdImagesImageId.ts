import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IMallPlatformProductSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformProductSnapshot";
import { IMallPlatformProductSnapshotImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformProductSnapshotImage";
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

export async function getMallPlatformSellerProductsProductIdSnapshotsSnapshotIdImagesImageId(props: {
  seller: SellerPayload;
  productId: string & tags.Format<"uuid">;
  snapshotId: string & tags.Format<"uuid">;
  imageId: string & tags.Format<"uuid">;
}): Promise<IMallPlatformProductSnapshotImage> {
  const product =
    await MyGlobal.prisma.mall_platform_products.findUniqueOrThrow({
      where: {
        id: props.productId,
      },
      select: {
        id: true,
        seller_account_id: true,
      },
    });
  if (product.seller_account_id !== props.seller.id) {
    throw new HttpException("Forbidden", 403);
  }
  const image =
    await MyGlobal.prisma.mall_platform_product_snapshot_images.findUniqueOrThrow(
      {
        where: {
          id: props.imageId,
        },
        select: {
          id: true,
          image_uri: true,
          sort_order: true,
          created_at: true,
          productSnapshot: {
            select: {
              id: true,
              product: {
                select: {
                  id: true,
                },
              },
            },
          },
        },
      },
    );
  if (
    image.productSnapshot.id !== props.snapshotId ||
    image.productSnapshot.product.id !== props.productId
  ) {
    throw new HttpException("Not Found", 404);
  }
  return {
    id: image.id,
    imageUri: image.image_uri,
    sortOrder: image.sort_order,
    productSnapshot: {
      id: image.productSnapshot.id,
      snapshotKind: undefined,
      productName: undefined,
      productDescription: undefined,
      categoryName: null,
      basePrice: 0,
      mainImageUri: null,
      imageCount: 0,
      variantCount: 0,
      createdAt: toISOStringSafe(image.created_at),
    } as never,
    createdAt: toISOStringSafe(image.created_at),
  };
}
