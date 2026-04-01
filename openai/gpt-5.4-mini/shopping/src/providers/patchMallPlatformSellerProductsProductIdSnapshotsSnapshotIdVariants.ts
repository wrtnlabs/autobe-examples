import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IMallPlatformProductSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformProductSnapshot";
import { IMallPlatformProductSnapshotVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformProductSnapshotVariant";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageIMallPlatformProductSnapshotVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIMallPlatformProductSnapshotVariant";
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

export async function patchMallPlatformSellerProductsProductIdSnapshotsSnapshotIdVariants(props: {
  seller: SellerPayload;
  productId: string & tags.Format<"uuid">;
  snapshotId: string & tags.Format<"uuid">;
  body: IMallPlatformProductSnapshotVariant.IRequest;
}): Promise<IPageIMallPlatformProductSnapshotVariant.ISummary> {
  const page: number = props.body.page ?? 1;
  const limit: number = props.body.limit ?? 100;
  const skip: number = (page - 1) * limit;
  const snapshot =
    await MyGlobal.prisma.mall_platform_product_snapshots.findUniqueOrThrow({
      where: {
        id: props.snapshotId,
      },
      select: {
        id: true,
        mall_platform_product_id: true,
        snapshot_kind: true,
        product_name: true,
        product_description: true,
        category_name: true,
        base_price: true,
        main_image_uri: true,
        image_count: true,
        variant_count: true,
        created_at: true,
        product: {
          select: {
            id: true,
            seller_account_id: true,
          },
        },
      },
    });
  if (snapshot.mall_platform_product_id !== props.productId) {
    throw new HttpException("Not Found", 404);
  }
  if (snapshot.product.seller_account_id !== props.seller.id) {
    throw new HttpException("Forbidden", 403);
  }
  const where: Prisma.mall_platform_product_snapshot_variantsWhereInput = {
    mall_platform_product_snapshot_id: props.snapshotId,
    ...(props.body.search !== undefined
      ? {
          OR: [
            {
              sku_code: {
                contains: props.body.search,
                mode: "insensitive",
              },
            },
            {
              option_values: {
                contains: props.body.search,
                mode: "insensitive",
              },
            },
          ],
        }
      : {}),
    ...(props.body.skuCode !== undefined
      ? { sku_code: props.body.skuCode }
      : {}),
    ...(props.body.isAvailable !== undefined
      ? { is_available: props.body.isAvailable }
      : {}),
    ...(props.body.priceOverrideMin !== undefined ||
    props.body.priceOverrideMax !== undefined
      ? {
          price_override: {
            ...(props.body.priceOverrideMin !== undefined
              ? { gte: props.body.priceOverrideMin }
              : {}),
            ...(props.body.priceOverrideMax !== undefined
              ? { lte: props.body.priceOverrideMax }
              : {}),
          },
        }
      : {}),
  };
  const data =
    await MyGlobal.prisma.mall_platform_product_snapshot_variants.findMany({
      where,
      skip,
      take: limit,
      orderBy: { created_at: "asc" },
      select: {
        id: true,
        sku_code: true,
        option_values: true,
        price_override: true,
        is_available: true,
        created_at: true,
      },
    });
  const records =
    await MyGlobal.prisma.mall_platform_product_snapshot_variants.count({
      where,
    });
  return {
    pagination: {
      current: page,
      limit,
      records,
      pages: Math.ceil(records / limit),
    },
    data: data.map((item) => ({
      id: item.id,
      productSnapshot: {
        id: snapshot.id,
        snapshotKind: snapshot.snapshot_kind,
        productName: snapshot.product_name,
        productDescription: snapshot.product_description,
        categoryName: snapshot.category_name,
        basePrice: snapshot.base_price,
        mainImageUri: snapshot.main_image_uri,
        imageCount: snapshot.image_count,
        variantCount: snapshot.variant_count,
        createdAt: toISOStringSafe(snapshot.created_at),
      },
      skuCode: item.sku_code,
      optionValues: item.option_values,
      priceOverride: item.price_override,
      isAvailable: item.is_available,
      createdAt: toISOStringSafe(item.created_at),
    })),
  };
}
