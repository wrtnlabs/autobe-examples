import { Prisma } from "@prisma/sdk";
import { ArrayUtil } from "@nestia/e2e";
import typia, { tags } from "typia";

import { IShoppingMallProductViewBySource } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductViewBySource";

import { toISOStringSafe } from "../utils/toISOStringSafe";

export namespace ShoppingMallProductViewBySourceTransformer {
  export type Payload = Prisma.shopping_mall_product_view_statsGetPayload<
    ReturnType<typeof select>
  >;
  export function select() {
    return {
      select: {
        id: true,
        view_count: true,
        click_through_rate: true,
        engagement_score: true,
        created_at: true,
        updated_at: true,
        deleted_at: true,
        product: true,
      },
    } satisfies Prisma.shopping_mall_product_view_statsFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<IShoppingMallProductViewBySource> {
    return {
      direct: input.view_count,
      search: input.view_count,
      social: input.view_count,
      email: input.view_count,
      referral: input.view_count,
      internal: input.view_count,
    };
  }
}
