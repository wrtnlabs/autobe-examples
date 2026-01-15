import { Prisma } from "@prisma/sdk";
import { ArrayUtil } from "@nestia/e2e";
import typia, { tags } from "typia";

import { IShoppingMallPaymentSurchargeRule } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallPaymentSurchargeRule";

import { toISOStringSafe } from "../utils/toISOStringSafe";

export namespace ShoppingMallPaymentSurchargeRuleAtSummaryTransformer {
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
        paymentMethod: {
          select: {
            name: true,
          },
        },
        region: {
          select: {
            country_code: true,
            currency_code: true,
          },
        },
      },
    } satisfies Prisma.shopping_mall_payment_surcharge_rulesFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<IShoppingMallPaymentSurchargeRule.ISummary> {
    return {
      id: input.id,
      payment_method_type: input.paymentMethod.name,
      country_code: input.region.country_code,
      currency_code: input.region.currency_code,
      surcharge_percentage: Number(input.surcharge_amount),
      effective_from: input.effective_date.toISOString(),
      is_active: true, // All rules are active in system - no active field in schema
      priority: 1, // Default priority as no priority field in schema
      description: undefined, // No description field in schema
    };
  }
}
