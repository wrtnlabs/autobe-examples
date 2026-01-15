import { Prisma } from "@prisma/sdk";
import { ArrayUtil } from "@nestia/e2e";
import typia, { tags } from "typia";

import { IShoppingMallProductTag } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductTag";

import { toISOStringSafe } from "../utils/toISOStringSafe";

export namespace ShoppingMallProductTagAtSummaryTransformer {
  export type Payload = Prisma.shopping_mall_product_tagsGetPayload<
    ReturnType<typeof select>
  >;
  export function select() {
    return {
      select: {
        id: true,
        name: true,
        created_at: true,
        updated_at: true,
      },
    } satisfies Prisma.shopping_mall_product_tagsFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<IShoppingMallProductTag.ISummary> {
    return {
      id: input.id,
      name: input.name,
      created_at: input.created_at.toISOString(),
      slug: input.name.toLowerCase().replace(/\s+/g, "-"),
      category: input.name.split(" ")[0],
      usage_count: 0,
      parent_tag_id: undefined,
      is_active: true,
    };
  }
}
