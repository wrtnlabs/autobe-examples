import { IEcommerceMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCategory";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import typia, { tags } from "typia";

import { toISOStringSafe } from "../utils/toISOStringSafe";

export namespace EcommerceMallCategoryAtSummaryTransformer {
  export type Payload = Prisma.ecommerce_mall_categoriesGetPayload<
    ReturnType<typeof select>
  >;
  export function select(): Prisma.ecommerce_mall_categoriesFindManyArgs {
    return {
      select: {
        id: true,
        name: true,
        slug: true,
        parent_id: true,
        display_order: true,
        is_active: true,
      },
    } satisfies Prisma.ecommerce_mall_categoriesFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<IEcommerceMallCategory.ISummary> {
    return {
      id: input.id,
      name: input.name,
      slug: input.slug,
      parent_id: input.parent_id ?? undefined,
      display_order: input.display_order ?? undefined,
      is_active: input.is_active ?? undefined,
      parent: null,
    };
  }
}
