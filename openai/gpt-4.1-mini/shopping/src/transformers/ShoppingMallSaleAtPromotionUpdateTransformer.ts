import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IShoppingMallSale } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSale";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import typia, { tags } from "typia";

import { toISOStringSafe } from "../utils/toISOStringSafe";

export namespace ShoppingMallSaleAtPromotionUpdateTransformer {
  export type Payload = Prisma.shopping_mall_sale_promotionsGetPayload<
    ReturnType<typeof select>
  >;
  export function select() {
    return {
      select: {
        discount_value: true,
        start_at: true,
        end_at: true,
        description: true,
        active: true,
        promotion_code: true,
        id: true,
        promotion_type: true,
        discount_type: true,
        created_at: true,
        updated_at: true,
        deleted_at: true,
        sale: {
          select: { id: true },
        },
      },
    } satisfies Prisma.shopping_mall_sale_promotionsFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<IShoppingMallSale.IPromotionUpdate> {
    return {
      discountPercentage: input.discount_value,
      startDate: input.start_at.toISOString(),
      endDate: input.end_at.toISOString(),
      conditions: input.description ?? null,
      active: input.active,
      title: input.promotion_code ?? null,
    };
  }
}
