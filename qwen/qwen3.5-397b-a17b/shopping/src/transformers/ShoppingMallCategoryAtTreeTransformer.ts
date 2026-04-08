import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IShoppingMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCategory";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import { VariadicSingleton } from "tstl";
import typia, { tags } from "typia";

import { MyGlobal } from "../MyGlobal";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export namespace ShoppingMallCategoryAtTreeTransformer {
  export type Payload = Prisma.shopping_mall_categoriesGetPayload<
    ReturnType<typeof select>
  >;
  export function select() {
    return {
      select: {
        id: true,
        name: true,
        description: true,
        children: undefined,
      },
    } satisfies Prisma.shopping_mall_categoriesFindManyArgs;
  }
  export async function transform(
    input: Payload,
    cache: VariadicSingleton<
      Promise<IShoppingMallCategory.ITree[]>,
      [string]
    > = createChildrenCache(),
  ): Promise<IShoppingMallCategory.ITree> {
    return {
      id: input.id,
      name: input.name,
      description: input.description ?? null,
      children: await cache.get(input.id),
    } satisfies IShoppingMallCategory.ITree;
  }
  export async function transformAll(
    inputs: Payload[],
  ): Promise<IShoppingMallCategory.ITree[]> {
    const cache = createChildrenCache();
    return await ArrayUtil.asyncMap(inputs, (x) => transform(x, cache));
  }
  function createChildrenCache() {
    const cache = new VariadicSingleton(
      async (parentId: string): Promise<IShoppingMallCategory.ITree[]> => {
        const records = await MyGlobal.prisma.shopping_mall_categories.findMany(
          {
            ...select(),
            where: { parent_id: parentId },
          },
        );
        return await ArrayUtil.asyncMap(records, (r) => transform(r, cache));
      },
    );
    return cache;
  }
}
