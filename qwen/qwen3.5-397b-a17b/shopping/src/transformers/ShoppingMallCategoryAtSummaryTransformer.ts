import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IShoppingMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCategory";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import { VariadicSingleton } from "tstl";
import typia, { tags } from "typia";

import { MyGlobal } from "../MyGlobal";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export namespace ShoppingMallCategoryAtSummaryTransformer {
  export type Payload = Prisma.shopping_mall_categoriesGetPayload<
    ReturnType<typeof select>
  >;
  export function select() {
    return {
      select: {
        id: true,
        name: true,
        description: true,
        created_at: true,
        updated_at: true,
        deleted_at: true,
        parent: {
          select: {
            id: true,
          },
        } satisfies Prisma.shopping_mall_categoriesFindManyArgs,
        children: {
          select: {
            id: true,
          },
        } satisfies Prisma.shopping_mall_categoriesFindManyArgs,
        snapshots: {
          select: {
            id: true,
          },
        } satisfies Prisma.shopping_mall_category_snapshotsFindManyArgs,
        products: {
          select: {
            id: true,
          },
        } satisfies Prisma.shopping_mall_productsFindManyArgs,
        productSnapshots: {
          select: {
            id: true,
          },
        } satisfies Prisma.shopping_mall_product_snapshotsFindManyArgs,
      },
    } satisfies Prisma.shopping_mall_categoriesFindManyArgs;
  }
  export async function transform(
    input: Payload,
    cache: VariadicSingleton<
      Promise<IShoppingMallCategory.ISummary>,
      [string]
    > = createCache(),
  ): Promise<IShoppingMallCategory.ISummary> {
    return {
      id: input.id,
      name: input.name,
      description: input.description,
      parent: input.parent ? await cache.get(input.parent.id) : null,
      hasChildren: input.children.length > 0,
    };
  }
  export async function transformAll(
    inputs: Payload[],
  ): Promise<IShoppingMallCategory.ISummary[]> {
    const cache = createCache();
    return await ArrayUtil.asyncMap(inputs, (x) => transform(x, cache));
  }
  function createCache() {
    const cache = new VariadicSingleton(
      async (id: string): Promise<IShoppingMallCategory.ISummary> => {
        const record =
          await MyGlobal.prisma.shopping_mall_categories.findFirstOrThrow({
            ...select(),
            where: { id },
          });
        return transform(record, cache);
      },
    );
    return cache;
  }
}
