import { IEcommerceMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCategory";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import { VariadicSingleton } from "tstl";
import typia, { tags } from "typia";

import { MyGlobal } from "../MyGlobal";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export namespace EcommerceMallCategoryAtSummaryTransformer {
  export type Payload = Prisma.ecommerce_mall_categoriesGetPayload<
    ReturnType<typeof select>
  >;
  export function select() {
    return {
      select: {
        id: true,
        name: true,
        slug: true,
        description: true,
        display_order: true,
        icon_uri: true,
        is_active: true,
        created_at: true,
        updated_at: true,
        deleted_at: true,
        parent: {
          select: {
            id: true,
            name: true,
            slug: true,
            parent_id: true,
            display_order: true,
            is_active: true,
            created_at: true,
            updated_at: true,
            deleted_at: true,
          },
        },
        children: true,
        snapshots: true,
        products: true,
      },
    } satisfies Prisma.ecommerce_mall_categoriesFindManyArgs;
  }
  export async function transform(
    input: Payload,
    cache: VariadicSingleton<
      Promise<IEcommerceMallCategory.ISummary>,
      [string]
    > = createCache(),
  ): Promise<IEcommerceMallCategory.ISummary> {
    return {
      id: input.id,
      name: input.name,
      slug: input.slug,
      parent_id: input.parent?.id ?? undefined,
      display_order: input.display_order ?? undefined,
      is_active: input.is_active ?? undefined,
      parent: input.parent ? await cache.get(input.parent.id) : null,
    } satisfies IEcommerceMallCategory.ISummary;
  }
  export async function transformAll(
    inputs: Payload[],
  ): Promise<IEcommerceMallCategory.ISummary[]> {
    const cache = createCache();
    return await ArrayUtil.asyncMap(inputs, (x) => transform(x, cache));
  }
  function createCache(): VariadicSingleton<
    Promise<IEcommerceMallCategory.ISummary>,
    [string]
  > {
    const cache = new VariadicSingleton<
      Promise<IEcommerceMallCategory.ISummary>,
      [string]
    >(async (id: string): Promise<IEcommerceMallCategory.ISummary> => {
      const record =
        await MyGlobal.prisma.ecommerce_mall_categories.findFirstOrThrow({
          ...select(),
          where: { id },
        });
      return transform(record, cache);
    });
    return cache;
  }
}
