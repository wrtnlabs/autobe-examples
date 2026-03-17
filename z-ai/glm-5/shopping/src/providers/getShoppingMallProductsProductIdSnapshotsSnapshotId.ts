import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IShoppingMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCategory";
import { IShoppingMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProduct";
import { IShoppingMallProductSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductSnapshot";
import { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function getShoppingMallProductsProductIdSnapshotsSnapshotId(props: {
  productId: string;
  snapshotId: string;
}): Promise<IShoppingMallProductSnapshot> {
  const snapshot =
    await MyGlobal.prisma.shopping_mall_product_snapshots.findUniqueOrThrow({
      where: { id: props.snapshotId },
      select: {
        id: true,
        shopping_mall_product_id: true,
        name: true,
        description: true,
        base_price: true,
        images: true,
        created_at: true,
        product: {
          select: {
            id: true,
            name: true,
            base_price: true,
            category: {
              select: {
                id: true,
                name: true,
                description: true,
                parent: {
                  select: {
                    id: true,
                    name: true,
                    description: true,
                    created_at: true,
                    updated_at: true,
                    deleted_at: true,
                  },
                },
                created_at: true,
                updated_at: true,
                deleted_at: true,
              },
            },
            seller: {
              select: {
                id: true,
                email: true,
                shop_name: true,
                shop_description: true,
                logo_image: true,
                approval_status: true,
                rejection_reason: true,
                suspended: true,
                banned: true,
                created_at: true,
                updated_at: true,
              },
            },
            images: {
              select: {
                image_url: true,
                display_order: true,
              },
              orderBy: { display_order: "asc" as const },
              take: 1,
            } satisfies Prisma.shopping_mall_product_imagesFindManyArgs,
            created_at: true,
          },
        },
        skuSnapshots: {
          select: {
            id: true,
            sku_code: true,
            option_values: true,
            price: true,
            stock_quantity: true,
            created_at: true,
          },
        },
      },
    });
  if (snapshot.shopping_mall_product_id !== props.productId) {
    throw new HttpException("Snapshot not found for this product", 404);
  }
  const primaryImage = snapshot.product.images[0]?.image_url ?? null;
  const transformCategory = (
    cat: typeof snapshot.product.category,
  ): IShoppingMallCategory.ISummary => ({
    id: cat.id,
    name: cat.name,
    description: cat.description,
    parent: cat.parent
      ? ({
          id: cat.parent.id,
          name: cat.parent.name,
          description: cat.parent.description,
          parent: null,
          created_at: cat.parent.created_at.toISOString(),
          updated_at: cat.parent.updated_at.toISOString(),
          deleted_at: cat.parent.deleted_at?.toISOString() ?? null,
        } satisfies IShoppingMallCategory.ISummary)
      : null,
    created_at: cat.created_at.toISOString(),
    updated_at: cat.updated_at.toISOString(),
    deleted_at: cat.deleted_at?.toISOString() ?? null,
  });
  return {
    id: snapshot.id,
    name: snapshot.name,
    description: snapshot.description,
    base_price: snapshot.base_price,
    images: snapshot.images,
    created_at: snapshot.created_at.toISOString(),
    product: {
      id: snapshot.product.id,
      name: snapshot.product.name,
      base_price: snapshot.product.base_price,
      category: transformCategory(snapshot.product.category),
      seller: {
        id: snapshot.product.seller.id,
        email: snapshot.product.seller.email,
        shop_name: snapshot.product.seller.shop_name,
        shop_description: snapshot.product.seller.shop_description,
        logo_image: snapshot.product.seller.logo_image,
        approval_status: snapshot.product.seller.approval_status,
        rejection_reason: snapshot.product.seller.rejection_reason,
        suspended: snapshot.product.seller.suspended,
        banned: snapshot.product.seller.banned,
        created_at: snapshot.product.seller.created_at.toISOString(),
        updated_at: snapshot.product.seller.updated_at.toISOString(),
      } satisfies IShoppingMallSeller.ISummary,
      primary_image: primaryImage,
      created_at: snapshot.product.created_at.toISOString(),
    } satisfies IShoppingMallProduct.ISummary,
    skuSnapshots: JSON.stringify(
      snapshot.skuSnapshots.map((sku) => ({
        id: sku.id,
        sku_code: sku.sku_code,
        option_values: JSON.parse(sku.option_values),
        price: sku.price,
        stock_quantity: sku.stock_quantity,
        created_at: sku.created_at.toISOString(),
      })),
    ),
  };
}
