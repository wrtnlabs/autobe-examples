import { Prisma } from "@prisma/sdk";
import { ArrayUtil } from "@nestia/e2e";
import typia, { tags } from "typia";

import { IShoppingMallPaymentRegion } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallPaymentRegion";

import { toISOStringSafe } from "../utils/toISOStringSafe";

export namespace ShoppingMallPaymentRegionAtSummaryTransformer {
  export type Payload = Prisma.shopping_mall_payment_regionsGetPayload<
    ReturnType<typeof select>
  >;
  export function select() {
    return {
      select: {
        id: true,
        country_code: true,
        currency_code: true,
        tax_rate: true,
        status: true,
        compliance_requirements: true,
        paymentMethod: {
          select: {
            name: true,
          },
        },
        shopping_mall_payment_surcharge_rules: {
          select: {
            paymentMethod: {
              select: {
                name: true,
              },
            },
          },
        },
      },
    } satisfies Prisma.shopping_mall_payment_regionsFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<IShoppingMallPaymentRegion.ISummary> {
    const paymentMethods = [
      ...(input.paymentMethod ? [input.paymentMethod.name] : []),
      ...input.shopping_mall_payment_surcharge_rules.map(
        (rule) => rule.paymentMethod.name,
      ),
    ];
    return {
      id: input.id,
      country_code: input.country_code,
      currency: input.currency_code,
      supported_payment_methods: paymentMethods satisfies string[] as string[],
      tax_rate: input.tax_rate,
      status: input.status,
      compliance_requirements: input.compliance_requirements,
    };
  }
}
