import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IShoppingMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCategory";
import { IShoppingMallProductSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductSnapshot";
import { IShoppingMallProductSnapshotImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductSnapshotImage";
import { IShoppingMallProductVariantSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductVariantSnapshot";
import { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
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

export async function getShoppingMallSellerProductsProductIdSnapshotsSnapshotId(props: {
  seller: SellerPayload;
  productId: string;
  snapshotId: string;
}): Promise<IShoppingMallProductSnapshot> {
  const snapshot =
    await MyGlobal.prisma.shopping_mall_product_snapshots.findUniqueOrThrow({
      where: { id: props.snapshotId },
      select: {
        id: true,
        shopping_mall_product_id: true,
        shopping_mall_seller_id: true,
        name: true,
        description: true,
        base_price: true,
        created_at: true,
        seller: {
          select: {
            id: true,
            email: true,
            shop_name: true,
            shop_description: true,
            logo_url: true,
            approval_status: true,
            rejection_reason: true,
            created_at: true,
            deleted_at: true,
          },
        },
        category: {
          select: {
            id: true,
            name: true,
            description: true,
            parent_id: true,
          },
        },
        variantSnapshots: {
          select: {
            id: true,
            sku_code: true,
            price_override: true,
            created_at: true,
            optionValues: {
              select: {
                option_key: true,
                option_value: true,
              },
            },
          },
        },
        snapshotImages: {
          select: {
            id: true,
            created_at: true,
            image: {
              select: {
                url: true,
                order: true,
              },
            },
          },
        },
      },
    });
  if (snapshot.shopping_mall_product_id !== props.productId) {
    throw new HttpException("Snapshot not found for this product", 404);
  }
  if (snapshot.shopping_mall_seller_id !== props.seller.id) {
    throw new HttpException("Forbidden", 403);
  }
  return {
    id: snapshot.id,
    name: snapshot.name,
    description: snapshot.description,
    basePrice: snapshot.base_price,
    seller: {
      id: snapshot.seller.id,
      email: snapshot.seller.email,
      shopName: snapshot.seller.shop_name,
      shopDescription: snapshot.seller.shop_description ?? undefined,
      logoUrl: snapshot.seller.logo_url ?? undefined,
      approvalStatus: snapshot.seller.approval_status,
      rejectionReason: snapshot.seller.rejection_reason ?? undefined,
      createdAt: snapshot.seller.created_at.toISOString(),
      deletedAt: snapshot.seller.deleted_at?.toISOString() ?? null,
    } satisfies IShoppingMallSeller.ISummary,
    category: snapshot.category
      ? ({
          id: snapshot.category.id,
          name: snapshot.category.name,
          description: snapshot.category.description,
          parentId: snapshot.category.parent_id,
        } satisfies IShoppingMallCategory.ISummary)
      : null,
    variantSnapshots: snapshot.variantSnapshots.map((vs) => ({
      id: vs.id,
      skuCode: vs.sku_code,
      priceOverride: vs.price_override,
      optionValues: JSON.stringify(
        vs.optionValues.map((ov) => ({
          key: ov.option_key,
          value: ov.option_value,
        })),
      ),
      createdAt: vs.created_at.toISOString(),
    })) satisfies IShoppingMallProductVariantSnapshot[],
    snapshotImages: snapshot.snapshotImages.map((si) => ({
      id: si.id,
      url: si.image.url,
      order: si.image.order,
      createdAt: si.created_at.toISOString(),
    })) satisfies IShoppingMallProductSnapshotImage[],
    createdAt: snapshot.created_at.toISOString(),
  };
}
