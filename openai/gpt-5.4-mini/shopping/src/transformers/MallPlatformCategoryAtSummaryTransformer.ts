import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IMallPlatformCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformCategory";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import { VariadicSingleton } from "tstl";
import typia, { tags } from "typia";

import { MyGlobal } from "../MyGlobal";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export namespace MallPlatformCategoryAtSummaryTransformer {
  export type Payload = Prisma.mall_platform_categoriesGetPayload<
    ReturnType<typeof select>
  >;
  export function select() {
    return {
      select: {
        id: true,
        parent_category_id: true,
        name: true,
        description: true,
        created_at: true,
        updated_at: true,
        deleted_at: true,
      },
    } satisfies Prisma.mall_platform_categoriesFindManyArgs;
  }
  export async function transform(
    input: Payload,
    cache: VariadicSingleton<
      Promise<IMallPlatformCategory.ISummary>,
      [string]
    > = createCache(),
  ): Promise<IMallPlatformCategory.ISummary> {
    return {
      id: input.id,
      parentCategory: input.parent_category_id
        ? await cache.get(input.parent_category_id)
        : null,
      name: input.name,
      description: input.description,
      createdAt: input.created_at.toISOString(),
      updatedAt: input.updated_at.toISOString(),
      deletedAt: input.deleted_at?.toISOString() ?? null,
    };
  }
  export async function transformAll(
    inputs: Payload[],
  ): Promise<IMallPlatformCategory.ISummary[]> {
    const cache = createCache();
    return await ArrayUtil.asyncMap(inputs, (x) => transform(x, cache));
  }
  function createCache() {
    const cache = new VariadicSingleton(
      async (id: string): Promise<IMallPlatformCategory.ISummary> => {
        const record =
          await MyGlobal.prisma.mall_platform_categories.findFirstOrThrow({
            ...select(),
            where: { id },
          });
        return transform(record, cache);
      },
    );
    return cache;
  }
}
