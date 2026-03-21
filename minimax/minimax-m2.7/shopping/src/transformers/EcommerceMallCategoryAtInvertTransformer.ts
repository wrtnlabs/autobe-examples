import { IEcommerceMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCategory";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import typia, { tags } from "typia";

import { toISOStringSafe } from "../utils/toISOStringSafe";
import { EcommerceMallCategoryAtSummaryTransformer } from "./EcommerceMallCategoryAtSummaryTransformer";

export namespace EcommerceMallCategoryAtInvertTransformer {
  export type Payload = Prisma.ecommerce_mall_categoriesGetPayload<
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
        parent: EcommerceMallCategoryAtSummaryTransformer.select(),
        subcategories: EcommerceMallCategoryAtSummaryTransformer.select(),
      },
    } satisfies Prisma.ecommerce_mall_categoriesFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<IEcommerceMallCategory.IInvert> {
    return {
      id: input.id,
      name: input.name,
      description: input.description ?? undefined,
      created_at: input.created_at.toISOString(),
      updated_at: input.updated_at.toISOString(),
      parent: input.parent
        ? await EcommerceMallCategoryAtSummaryTransformer.transform(
            input.parent,
          )
        : undefined,
      subcategories: await ArrayUtil.asyncMap(
        input.subcategories,
        EcommerceMallCategoryAtSummaryTransformer.transform,
      ),
    };
  }
}
