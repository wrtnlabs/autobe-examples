import { Prisma } from "@prisma/sdk";
import { ArrayUtil } from "@nestia/e2e";
import typia, { tags } from "typia";

import { IShoppingMallConfigurationPaymentSurchargeRules } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallConfigurationPaymentSurchargeRules";

import { toISOStringSafe } from "../utils/toISOStringSafe";

export namespace ShoppingMallConfigurationPaymentSurchargeRulesTransformer {
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
          },
        },
      },
    } satisfies Prisma.shopping_mall_payment_surcharge_rulesFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<IShoppingMallConfigurationPaymentSurchargeRules> {
    return {
      amount: Number(input.surcharge_amount),
      startDate: toISOStringSafe(input.effective_date),
      endDate: toISOStringSafe(input.updated_at),
      paymentMethod: input.paymentMethod.name as
        | "credit_card"
        | "debit_card"
        | "paypal"
        | "apple_pay"
        | "google_pay"
        | "cryptocurrency"
        | "bank_transfer"
        | "sepa"
        | "ach",
      region: input.region.country_code as
        | "US"
        | "CA"
        | "GB"
        | "DE"
        | "FR"
        | "JP"
        | "AU"
        | "BR"
        | "CN"
        | "SG"
        | "KR"
        | "MX"
        | "AR"
        | "ZA"
        | "SE"
        | "NO"
        | "NL"
        | "BE"
        | "CH",
      minAmount: undefined,
      maxAmount: undefined,
      currency: "USD",
      isActive: true,
    };
  }
}
