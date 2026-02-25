import { IEcommerceCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceCategory";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import typia, { tags } from "typia";

import { toISOStringSafe } from "../utils/toISOStringSafe";
import { EcommerceCategoryAtSummaryTransformer } from "./EcommerceCategoryAtSummaryTransformer";

export namespace EcommerceCategoryTransformer {
  export type Payload = Prisma.ecommerce_categoriesGetPayload<
    ReturnType<typeof select>
  >;
  export function select() {
    return {
      select: {
        id: true,
        name: true,
        description: true,
        parent: EcommerceCategoryAtSummaryTransformer.select(),
        created_at: true,
        updated_at: true,
        deleted_at: true,
        metadataRegistryRelationships: {
          select: {
            id: true,
          },
        } satisfies Prisma.ecommerce_metadata_registry_relationshipsFindManyArgs,
        subcategories: {
          select: {
            id: true,
          },
        } satisfies Prisma.ecommerce_categoriesFindManyArgs,
        products: {
          select: {
            id: true,
          },
        } satisfies Prisma.ecommerce_productsFindManyArgs,
        adminOperations: {
          select: {
            id: true,
          },
        } satisfies Prisma.ecommerce_db_migrationsFindManyArgs,
      },
    } satisfies Prisma.ecommerce_categoriesFindManyArgs;
  }
  export async function transform(input: Payload): Promise<IEcommerceCategory> {
    return {
      id: input.id,
      name: input.name,
      description: input.description ?? null,
      parent_category_id: input.parent?.id ?? null,
      parent: input.parent
        ? await EcommerceCategoryAtSummaryTransformer.transform(input.parent)
        : null,
      created_at: toISOStringSafe(input.created_at),
      updated_at: toISOStringSafe(input.updated_at),
      deleted_at: input.deleted_at ? toISOStringSafe(input.deleted_at) : null,
    };
  }
}
