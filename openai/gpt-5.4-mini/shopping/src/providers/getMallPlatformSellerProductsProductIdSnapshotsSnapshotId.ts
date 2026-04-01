import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IMallPlatformCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformCategory";
import { IMallPlatformProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformProduct";
import { IMallPlatformProductSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformProductSnapshot";
import { IMallPlatformProductSnapshotImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformProductSnapshotImage";
import { IMallPlatformProductSnapshotVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformProductSnapshotVariant";
import { IMallPlatformSellerAccount } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformSellerAccount";
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

export async function getMallPlatformSellerProductsProductIdSnapshotsSnapshotId(props: {
  seller: SellerPayload;
  productId: string & tags.Format<"uuid">;
  snapshotId: string & tags.Format<"uuid">;
}): Promise<IMallPlatformProductSnapshot> {
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
    throw new HttpException("Not Found", 404);
  }
  const snapshot =
    await MyGlobal.prisma.mall_platform_product_snapshots.findFirstOrThrow({
      where: {
        id: props.snapshotId,
        mall_platform_product_id: props.productId,
      },
      select: {
        id: true,
        snapshot_kind: true,
        product_name: true,
        product_description: true,
        category_name: true,
        base_price: true,
        main_image_uri: true,
        image_count: true,
        variant_count: true,
        created_at: true,
      },
    });
  return {
    id: snapshot.id,
    product: {
      id: props.productId,
      name: snapshot.product_name,
      description: snapshot.product_description,
      basePrice: snapshot.base_price,
      sellerAccount: {
        id: props.seller.id,
        email: "",
        approvalStatus: "",
        rejectionReason: null,
        suspendedAt: null,
        deletedAt: null,
        createdAt: toISOStringSafe(snapshot.created_at),
        updatedAt: toISOStringSafe(snapshot.created_at),
      } satisfies IMallPlatformSellerAccount.ISummary,
      category: null,
      createdAt: toISOStringSafe(snapshot.created_at),
      updatedAt: toISOStringSafe(snapshot.created_at),
      deletedAt: null,
    } satisfies IMallPlatformProduct.ISummary,
    snapshotKind: snapshot.snapshot_kind,
    productName: snapshot.product_name,
    productDescription: snapshot.product_description,
    categoryName: snapshot.category_name ?? null,
    basePrice: snapshot.base_price,
    mainImageUri: snapshot.main_image_uri ?? null,
    imageCount: snapshot.image_count,
    variantCount: snapshot.variant_count,
    createdAt: toISOStringSafe(snapshot.created_at),
    images: [] as IMallPlatformProductSnapshotImage[],
    variants: [] as IMallPlatformProductSnapshotVariant[],
  } satisfies IMallPlatformProductSnapshot;
}
