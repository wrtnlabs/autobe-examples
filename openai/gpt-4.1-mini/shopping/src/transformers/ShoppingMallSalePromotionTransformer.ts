import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IShoppingMallProductCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductCategory";
import { IShoppingMallSale } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSale";
import { IShoppingMallSalePromotion } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSalePromotion";
import { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import typia, { tags } from "typia";

import { toISOStringSafe } from "../utils/toISOStringSafe";
import { ShoppingMallSaleAtSummaryTransformer } from "./ShoppingMallSaleAtSummaryTransformer";

export namespace ShoppingMallSalePromotionTransformer {
  export type Payload = Prisma.shopping_mall_sale_promotionsGetPayload<
    ReturnType<typeof select>
  >;
  export function select() {
    return {
      select: {
        id: true,
        shopping_mall_sale_id: true,
        promotion_code: true,
        promotion_type: true,
        description: true,
        discount_value: true,
        discount_type: true,
        start_at: true,
        end_at: true,
        active: true,
        created_at: true,
        updated_at: true,
        deleted_at: true,
        sale: ShoppingMallSaleAtSummaryTransformer.select(),
      },
    } satisfies Prisma.shopping_mall_sale_promotionsFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<IShoppingMallSalePromotion> {
    return {
      id: input.id,
      shoppingMallSaleId: input.shopping_mall_sale_id,
      promotionCode: input.promotion_code ?? null,
      promotionType: input.promotion_type,
      description: input.description ?? null,
      discountValue: input.discount_value,
      discountType: input.discount_type,
      startAt: input.start_at.toISOString(),
      endAt: input.end_at.toISOString(),
      active: input.active,
      createdAt: input.created_at.toISOString(),
      updatedAt: input.updated_at.toISOString(),
      deletedAt: input.deleted_at?.toISOString() ?? null,
      sale: await ShoppingMallSaleAtSummaryTransformer.transform(input.sale),
    };
  }
}
