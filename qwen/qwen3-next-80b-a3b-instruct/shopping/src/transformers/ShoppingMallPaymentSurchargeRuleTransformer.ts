import { Prisma } from "@prisma/sdk";
import { ArrayUtil } from "@nestia/e2e";
import typia, { tags } from "typia";

import { IShoppingMallPaymentSurchargeRule } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallPaymentSurchargeRule";

import { toISOStringSafe } from "../utils/toISOStringSafe";

export namespace ShoppingMallPaymentSurchargeRuleTransformer {
  export type Payload = Prisma.shopping_mall_payment_surcharge_rulesGetPayload<
    ReturnType<typeof select>
  >;
  export function select() {
    return {
      select: {
        id: true,
        surcharge_amount: true,
        effective_date: true,
        created_at: true,
        updated_at: true,
        paymentMethod: true,
        region: true,
      },
    } satisfies Prisma.shopping_mall_payment_surcharge_rulesFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<IShoppingMallPaymentSurchargeRule> {
    return {
      id: input.id,
      payment_method_id: input.paymentMethod.id,
      region_id: input.region.id,
      currency_code: "",
      min_amount: undefined,
      max_amount: 0,
      priority: 1,
      applicable_from: input.effective_date.toISOString(),
      applicable_to: undefined, // Corrected: null -> undefined to match type constraint
      surcharge_amount: input.surcharge_amount,
      surcharge_percentage: undefined,
      is_active: true,
      createdAt: input.created_at.toISOString(),
      updatedAt: input.updated_at.toISOString(),
    };
  }
}
