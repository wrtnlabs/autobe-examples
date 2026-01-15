import { ArrayUtil, RandomGenerator } from "@nestia/e2e";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IShoppingMallPaymentMethod } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallPaymentMethod";
import { IShoppingMallPaymentMethodBillingInterval } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallPaymentMethodBillingInterval";
import { IShoppingMallPaymentMethodCustomerIdRequirement } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallPaymentMethodCustomerIdRequirement";
export function prepare_random_shopping_mall_payment_method(
  input?: DeepPartial<IShoppingMallPaymentMethod.ICreate>,
): IShoppingMallPaymentMethod.ICreate {
  return {
    gatewayId:
      input?.gatewayId ??
      RandomGenerator.alphabets(
        typia.random<
          number & tags.Type<"uint32"> & tags.Minimum<1> & tags.Maximum<50>
        >(),
      ),
    supportedCurrencies:
      input?.supportedCurrencies ??
      ArrayUtil.repeat(
        typia.random<
          number & tags.Type<"uint32"> & tags.Minimum<1> & tags.Maximum<5>
        >(),
        () => RandomGenerator.alphabets(3).toUpperCase(),
      ),
    enabledRegions:
      input?.enabledRegions ??
      ArrayUtil.repeat(
        typia.random<
          number & tags.Type<"uint32"> & tags.Minimum<1> & tags.Maximum<5>
        >(),
        () => RandomGenerator.alphabets(2).toUpperCase(),
      ),
    feePercentage:
      input?.feePercentage ??
      typia.random<
        number & tags.Type<"float"> & tags.Minimum<0> & tags.Maximum<100>
      >(),
    feeFixedAmount:
      input?.feeFixedAmount ??
      typia.random<
        number & tags.Type<"float"> & tags.Minimum<0> & tags.Maximum<1000>
      >(),
    requires3DSecure:
      input?.requires3DSecure ?? RandomGenerator.pick([true, false] as const),
    maxAmount:
      input?.maxAmount ??
      typia.random<
        number & tags.Type<"float"> & tags.Minimum<1> & tags.Maximum<999999999>
      >(),
    minAmount:
      input?.minAmount ??
      typia.random<
        number & tags.Type<"float"> & tags.Minimum<0> & tags.Maximum<1000>
      >(),
    experimental:
      input?.experimental ?? RandomGenerator.pick([true, false] as const),
    onboardingUrl:
      input?.onboardingUrl ??
      `https://example.com/onboarding/${RandomGenerator.alphabets(10)}`,
    businessClassification:
      input?.businessClassification ??
      RandomGenerator.alphabets(
        typia.random<
          number & tags.Type<"uint32"> & tags.Minimum<1> & tags.Maximum<50>
        >(),
      ),
    autoRefundEnabled:
      input?.autoRefundEnabled ?? RandomGenerator.pick([true, false] as const),
    negotiatedRateOverride:
      input?.negotiatedRateOverride ??
      (RandomGenerator.pick([true, false] as const)
        ? typia.random<
            number & tags.Type<"float"> & tags.Minimum<0> & tags.Maximum<100>
          >()
        : undefined),
    settlementDays:
      input?.settlementDays ??
      typia.random<
        number & tags.Type<"int32"> & tags.Minimum<1> & tags.Maximum<30>
      >(),
    primaryForRegion:
      input?.primaryForRegion ?? RandomGenerator.pick([true, false] as const),
    refundUrl:
      input?.refundUrl ??
      `https://example.com/refund-policy/${RandomGenerator.alphabets(8)}`,
    supportsPartialCapture:
      input?.supportsPartialCapture ??
      RandomGenerator.pick([true, false] as const),
    authExpiryHours:
      input?.authExpiryHours ??
      typia.random<
        number & tags.Type<"int32"> & tags.Minimum<1> & tags.Maximum<168>
      >(),
    supportsRecurring:
      input?.supportsRecurring ?? RandomGenerator.pick([true, false] as const),
    intervalBillingSupport:
      input?.intervalBillingSupport ??
      RandomGenerator.pick([
        "monthly",
        "weekly",
        "yearly",
        "quarterly",
      ] as const),
    customerIdRequirement:
      input?.customerIdRequirement ??
      RandomGenerator.pick(["required", "optional", "forbidden"] as const),
    marketingDescription:
      input?.marketingDescription ??
      RandomGenerator.paragraph({
        sentences: 1,
        wordMin: 3,
        wordMax: 8,
      }),
    documentationUrl:
      input?.documentationUrl ??
      `https://example.com/docs/${RandomGenerator.alphabets(6)}`,
  };
}