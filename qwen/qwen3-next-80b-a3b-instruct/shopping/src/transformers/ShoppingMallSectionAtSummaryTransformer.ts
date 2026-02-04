import { Prisma } from "@prisma/sdk";
import { ArrayUtil } from "@nestia/e2e";
import typia, { tags } from "typia";

import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IShoppingMallSection } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSection";

import { toISOStringSafe } from "../utils/toISOStringSafe";

// Remove import that conflicts with local declaration
export namespace ShoppingMallSectionAtSummaryTransformerInternal {
  export type Payload = Prisma.shopping_mall_sectionsGetPayload<
    ReturnType<typeof select>
  >;
  export function select(): Prisma.shopping_mall_sectionsFindManyArgs {
    return {
      select: {
        id: true,
        name: true,
        description: true,
        created_at: true,
        updated_at: true,
        deleted_at: true,
        parent_section_id: true,
      },
    };
  }
  export async function transform(
    input: Payload,
  ): Promise<IShoppingMallSection.ISummary> {
    return {
      id: input.id,
      name: input.name,
      description: input.description || "",
      parent: input.parent_section_id
        ? await ShoppingMallSectionAtSummaryTransformerInternal.transform({
            ...input,
            parent: input.parent_section_id,
          } as Payload)
        : undefined,
    };
  }
}
// Export transform function as the public API
export const transform =
  ShoppingMallSectionAtSummaryTransformerInternal.transform;
export const select = ShoppingMallSectionAtSummaryTransformerInternal.select;
export type Payload = ShoppingMallSectionAtSummaryTransformerInternal.Payload;
