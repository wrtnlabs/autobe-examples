import { IEcommerceCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceCategory";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import typia, { tags } from "typia";

import { toISOStringSafe } from "../utils/toISOStringSafe";

export namespace EcommerceCategoryAtSummaryTransformer {
  export type Payload = Prisma.ecommerce_categoriesGetPayload<
    ReturnType<typeof select>
  >;
  export function select() {
    const selfSelect = {
      select: {
        id: true,
        name: true,
        description: true,
        created_at: true,
        updated_at: true,
        deleted_at: true,
        parent: null as any,
        metadataRegistryRelationships: {
          select: { id: true },
        } satisfies Prisma.ecommerce_metadata_registry_relationshipsFindManyArgs,
        subcategories: {
          select: { id: true },
        } satisfies Prisma.ecommerce_categoriesFindManyArgs,
        products: {
          select: { id: true },
        } satisfies Prisma.ecommerce_productsFindManyArgs,
        adminOperations: {
          select: { id: true },
        } satisfies Prisma.ecommerce_admin_category_operationsFindManyArgs,
      },
    } satisfies Prisma.ecommerce_categoriesFindManyArgs;
    // Set up recursive parent selection
    selfSelect.select.parent = selfSelect;
    return selfSelect;
  }
  export async function transform(
    input: Payload,
  ): Promise<IEcommerceCategory.ISummary> {
    return {
      id: input.id,
      name: input.name,
      parent: input.parent
        ? {
            id: input.parent.id,
            name: input.parent.name,
            parent: null,
            products_count: 0, // Parent's products count is not available in summary view
            created_at: toISOStringSafe(input.parent.created_at),
          }
        : null,
      products_count: input.products.length,
      created_at: toISOStringSafe(input.created_at),
    };
  }
}
