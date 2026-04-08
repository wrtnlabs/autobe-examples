import { IEcommerceCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceCategory";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import { VariadicSingleton } from "tstl";
import typia, { tags } from "typia";

import { MyGlobal } from "../MyGlobal";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export namespace EcommerceCategoryAtSummaryTransformer {
  export type Payload = Prisma.ecommerce_categoriesGetPayload<
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
        parent_id: true,
        parentCategory: undefined,
        subcategories: undefined,
        snapshots: undefined,
        products: undefined,
      },
    } satisfies Prisma.ecommerce_categoriesFindManyArgs;
  }
  export async function transform(
    input: Payload,
    cache: VariadicSingleton<
      Promise<IEcommerceCategory.ISummary>,
      [string]
    > = createParentCache(),
  ): Promise<IEcommerceCategory.ISummary> {
    return {
      id: input.id,
      name: input.name,
      description: input.description ?? null,
      parent: input.parent_id ? await cache.get(input.parent_id) : null,
      created_at: toISOStringSafe(input.created_at),
      updated_at: toISOStringSafe(input.updated_at),
      deleted_at: input.deleted_at ? toISOStringSafe(input.deleted_at) : null,
    } satisfies IEcommerceCategory.ISummary;
  }
  export async function transformAll(
    inputs: Payload[],
  ): Promise<IEcommerceCategory.ISummary[]> {
    const cache = createParentCache();
    return await ArrayUtil.asyncMap(inputs, (x) => transform(x, cache));
  }
  function createParentCache() {
    const cache = new VariadicSingleton(
      async (id: string): Promise<IEcommerceCategory.ISummary> => {
        const record =
          await MyGlobal.prisma.ecommerce_categories.findFirstOrThrow({
            ...select(),
            where: { id },
          });
        return transform(record, cache);
      },
    );
    return cache;
  }
}
