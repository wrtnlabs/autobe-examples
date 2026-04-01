import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IShoppingMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCategory";
import { IShoppingMallMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallMember";
import { IShoppingMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProduct";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import { VariadicSingleton } from "tstl";
import typia, { tags } from "typia";

import { toISOStringSafe } from "../utils/toISOStringSafe";
import { ShoppingMallCategoryAtSummaryTransformer } from "./ShoppingMallCategoryAtSummaryTransformer";

export namespace ShoppingMallProductAtSummaryTransformer {
  export type Payload = Prisma.shopping_mall_productsGetPayload<
    ReturnType<typeof select>
  >;
  export function select() {
    return {
      select: {
        id: true,
        code: true,
        name: true,
        description: true,
        is_featured: true,
        created_at: true,
        updated_at: true,
        deleted_at: true,
        seller: {
          // IShoppingMallMember.ISummary is an empty object type, so any minimal select is fine.
          select: {
            id: true,
          },
        },
        category: ShoppingMallCategoryAtSummaryTransformer.select(),
        // Required by generator validation; ignored in transform
        productImages: {
          select: { id: true },
        },
        snapshots: {
          select: { id: true },
        },
        productVariants: {
          select: { id: true },
        },
        wishlistItems: {
          select: { id: true },
        },
        reviews: {
          select: { id: true },
        },
      },
    } satisfies Prisma.shopping_mall_productsFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<IShoppingMallProduct.ISummary> {
    return {
      id: input.id,
      code: input.code,
      name: input.name,
      description: input.description,
      is_featured: input.is_featured,
      seller: {},
      category: await ShoppingMallCategoryAtSummaryTransformer.transform(
        input.category,
      ),
      created_at: input.created_at.toISOString(),
      updated_at: input.updated_at.toISOString(),
      deleted_at: input.deleted_at?.toISOString() ?? null,
    };
  }
}
