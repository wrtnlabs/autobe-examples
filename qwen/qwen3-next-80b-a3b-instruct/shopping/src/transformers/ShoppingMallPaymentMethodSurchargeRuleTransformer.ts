import { Prisma } from "@prisma/sdk";
import { ArrayUtil } from "@nestia/e2e";
import typia, { tags } from "typia";

import { IShoppingMallPaymentMethodSurchargeRule } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallPaymentMethodSurchargeRule";

import { toISOStringSafe } from "../utils/toISOStringSafe";

export namespace ShoppingMallPaymentMethodSurchargeRuleTransformer {
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
            id: true,
          },
        },
        region: {
          select: {
            id: true,
          },
        },
      },
    } satisfies Prisma.shopping_mall_payment_surcharge_rulesFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<IShoppingMallPaymentMethodSurchargeRule> {
    return {
      payment_method_id: input.paymentMethod.id,
      priority: 100,
      amount_min: undefined,
      amount_max: undefined,
      region: input.region.id,
      fee_type: "fixed",
      percentage_fee: undefined,
      fixed_fee: Number(input.surcharge_amount),
      currency: "KRW",
      is_enabled: true,
      description: "Default surcharge rule",
    };
  }
}
