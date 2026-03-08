import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IShoppingMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCategory";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import typia, { tags } from "typia";

import { toISOStringSafe } from "../utils/toISOStringSafe";
import { ShoppingMallCategoryAtSummaryTransformer } from "./ShoppingMallCategoryAtSummaryTransformer";

export namespace ShoppingMallCategoryTransformer {
  // Explicit Payload type since Prisma inference doesn't properly resolve
  // nested select from neighbor transformer with type-annotated return
  export type Payload = {
    id: string;
    name: string;
    description: string | null;
    created_at: Date;
    updated_at: Date;
    deleted_at: Date | null;
    parent: ShoppingMallCategoryAtSummaryTransformer.Payload | null;
  };
  export function select() {
    return {
      select: {
        id: true,
        name: true,
        description: true,
        created_at: true,
        updated_at: true,
        deleted_at: true,
        parent: ShoppingMallCategoryAtSummaryTransformer.select(),
      },
    } satisfies Prisma.shopping_mall_categoriesFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<IShoppingMallCategory> {
    return {
      id: input.id,
      name: input.name,
      description: input.description,
      parent:
        input.parent !== null
          ? await ShoppingMallCategoryAtSummaryTransformer.transform(
              input.parent,
            )
          : null,
      created_at: input.created_at.toISOString(),
      updated_at: input.updated_at.toISOString(),
      deleted_at: input.deleted_at?.toISOString() ?? null,
    };
  }
}
