import { IEcommerceCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceCategory";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import typia, { tags } from "typia";

import { toISOStringSafe } from "../utils/toISOStringSafe";
import { EcommerceCategoryAtSummaryTransformer } from "./EcommerceCategoryAtSummaryTransformer";

export namespace EcommerceCategoryAtSummaryTransformer {
  export type Payload = Prisma.ecommerce_categoriesGetPayload<
    ReturnType<typeof select>
  >;
  export function select(): Prisma.ecommerce_categoriesFindManyArgs {
    return {
      select: {
        id: true,
        name: true,
        description: true,
        parent: { select: EcommerceCategoryAtSummaryTransformer.select() },
        created_at: true,
        updated_at: true,
        deleted_at: true,
        products: true,
        children: true,
        snapshots: true,
        productLinks: true,
      },
    } satisfies Prisma.ecommerce_categoriesFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<IEcommerceCategory.ISummary> {
    return {
      id: input.id,
      name: input.name,
      description: input.description ?? undefined,
      parent: input.parent
        ? await EcommerceCategoryAtSummaryTransformer.transform(input.parent)
        : undefined,
      created_at: toISOStringSafe(input.created_at),
      updated_at: toISOStringSafe(input.updated_at),
    };
  }
}
