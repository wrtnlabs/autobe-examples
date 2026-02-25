import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IShoppingMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCategory";
import { IShoppingMallOrderProductSnapshots } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrderProductSnapshots";
import { IShoppingMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProduct";
import { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import typia, { tags } from "typia";

import { toISOStringSafe } from "../utils/toISOStringSafe";

export namespace ShoppingMallOrderProductSnapshotsAtSummaryTransformer {
  export type Payload = Prisma.shopping_mall_order_product_snapshotsGetPayload<
    ReturnType<typeof select>
  >;
  export function select() {
    return {
      select: {
        id: true,
        snapshot_version: true,
        snapshot_timestamp: true,
        name: true,
        description: true,
        shopping_mall_category_id: true,
        base_price: true,
        is_deleted: true,
        deleted_at: true,
        created_at: true,
        updated_at: true,
        deleted_at_2: true,
        product: {
          select: {
            id: true,
            name: true,
            base_price: true,
            is_deleted: true,
            deleted_at: true,
            seller: {
              select: {
                id: true,
                shop_name: true,
                approval_status: true,
                created_at: true,
              },
            },
            category: {
              select: {
                id: true,
                name: true,
                description: true,
                parent_category_id: true,
              },
            },
          },
        } satisfies Prisma.shopping_mall_productsFindFirstArgs,
      },
    } satisfies Prisma.shopping_mall_order_product_snapshotsFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<IShoppingMallOrderProductSnapshots.ISummary> {
    return {
      id: input.id,
      name: input.name,
      description: input.description,
      base_price: input.base_price,
      category: {
        id: input.product.category.id,
        name: input.product.category.name,
        description: input.product.category.description ?? null,
        parent: input.product.category.parent_category_id
          ? {
              id: input.product.category.parent_category_id,
              name: input.product.category.name,
              description: input.product.category.description ?? null,
              parent: null,
              subcategory_count: 0,
            }
          : null,
        subcategory_count: 0,
      },
      product: {
        id: input.product.id,
        name: input.product.name,
        base_price: input.product.base_price,
        is_deleted: input.product.is_deleted,
        seller: {
          id: input.product.seller.id,
          shop_name: input.product.seller.shop_name,
          approval_status: input.product.seller.approval_status,
          created_at: input.product.seller.created_at.toISOString(),
        },
        category: {
          id: input.product.category.id,
          name: input.product.category.name,
          description: input.product.category.description ?? null,
          parent: input.product.category.parent_category_id
            ? {
                id: input.product.category.parent_category_id,
                name: input.product.category.name,
                description: input.product.category.description ?? null,
                parent: null,
                subcategory_count: 0,
              }
            : null,
          subcategory_count: 0,
        },
        average_rating: 0,
      },
    };
  }
}
