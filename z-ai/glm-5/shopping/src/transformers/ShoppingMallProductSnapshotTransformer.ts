import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IShoppingMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCategory";
import { IShoppingMallProductSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductSnapshot";
import { IShoppingMallProductSnapshotImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductSnapshotImage";
import { IShoppingMallProductVariantSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductVariantSnapshot";
import { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import typia, { tags } from "typia";

import { toISOStringSafe } from "../utils/toISOStringSafe";

export namespace ShoppingMallProductSnapshotTransformer {
  export type Payload = Prisma.shopping_mall_product_snapshotsGetPayload<
    ReturnType<typeof select>
  >;
  export function select() {
    return {
      select: {
        id: true,
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
    } satisfies Prisma.shopping_mall_product_snapshotsFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<IShoppingMallProductSnapshot> {
    return {
      id: input.id,
      name: input.name,
      description: input.description,
      basePrice: input.base_price,
      seller: {
        id: input.seller.id,
        email: input.seller.email,
        shopName: input.seller.shop_name,
        shopDescription: input.seller.shop_description ?? undefined,
        logoUrl: input.seller.logo_url ?? undefined,
        approvalStatus: input.seller.approval_status,
        rejectionReason: input.seller.rejection_reason ?? undefined,
        createdAt: input.seller.created_at.toISOString(),
        deletedAt: input.seller.deleted_at?.toISOString() ?? null,
      } satisfies IShoppingMallSeller.ISummary,
      category: input.category
        ? ({
            id: input.category.id,
            name: input.category.name,
            description: input.category.description,
            parentId: input.category.parent_id,
          } satisfies IShoppingMallCategory.ISummary)
        : null,
      variantSnapshots: await ArrayUtil.asyncMap(
        input.variantSnapshots,
        async (vs) =>
          ({
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
          }) satisfies IShoppingMallProductVariantSnapshot,
      ),
      snapshotImages: await ArrayUtil.asyncMap(
        input.snapshotImages,
        async (si) =>
          ({
            id: si.id,
            url: si.image.url,
            order: si.image.order,
            createdAt: si.created_at.toISOString(),
          }) satisfies IShoppingMallProductSnapshotImage,
      ),
      createdAt: input.created_at.toISOString(),
    };
  }
}
