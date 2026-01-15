import { ArrayUtil, RandomGenerator } from "@nestia/e2e";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IShoppingMallPaymentSurchargeRule } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallPaymentSurchargeRule";
export function prepare_random_shopping_mall_payment_surcharge_rule(
  input?: DeepPartial<IShoppingMallPaymentSurchargeRule.ICreate>,
): IShoppingMallPaymentSurchargeRule.ICreate {
  return {
    // Test-customizable: payment method ID
    payment_method_id:
      input?.payment_method_id ?? typia.random<string & tags.Format<"uuid">>(),
    // Test-customizable: region ID (optional, 50% null)
    region_id:
      input?.region_id ??
      RandomGenerator.pick([
        undefined,
        typia.random<string & tags.Format<"uuid">>(),
      ]),
    // Test-customizable: currency code (nullable)
    currency_code:
      input?.currency_code ??
      RandomGenerator.pick(["USD", "EUR", "JPY", undefined] as const),
    // Test-customizable: min amount (nullable, 0-10000)
    min_amount:
      input?.min_amount ??
      RandomGenerator.pick([
        undefined,
        typia.random<
          number & tags.Type<"uint32"> & tags.Minimum<0> & tags.Maximum<10000>
        >(),
      ]),
    // Test-customizable: max amount (nullable, 0-10000, >= min_amount if min_amount set)
    max_amount:
      input?.max_amount ??
      (() => {
        const min = input?.min_amount;
        if (min === null || min === undefined)
          return typia.random<
            number & tags.Type<"uint32"> & tags.Minimum<0> & tags.Maximum<10000>
          >();
        // Extract the numeric value from min and use as literal
        const minNumber = min as number;
        // Since Typia requires literal types for Minimum/Maximum, we cannot use minNumber dynamically.
        // Instead, use a safe range from minNumber to 10000, but raw number typed without Typia tag for minimum.
        // Use typia.assert to ensure at runtime the value is >= minNumber and <= 10000.
        const value = typia.random<number & tags.Type<"uint32"> & tags.Maximum<10000>>();
        return value >= minNumber ? value : minNumber;
      })(),
    // Auto-generated: surcharge_amount OR surcharge_percentage (mutually exclusive)
    // Randomly pick one to generate, the other will be null
    surcharge_amount:
      input?.surcharge_amount ??
      (input?.surcharge_percentage === undefined &&
      RandomGenerator.pick([true, false] as const)
        ? typia.random<
            number & tags.Type<"float"> & tags.Minimum<0> & tags.Maximum<100>
          >()
        : undefined),
    // Auto-generated: surcharge_amount OR surcharge_percentage (mutually exclusive)
    surcharge_percentage:
      input?.surcharge_percentage ??
      (input?.surcharge_amount === undefined &&
      RandomGenerator.pick([true, false] as const)
        ? typia.random<
            number & tags.Type<"float"> & tags.Minimum<0> & tags.Maximum<100>
          >()
        : undefined),
    // Auto-generated: priority (positive integer 1-100)
    priority:
      input?.priority ??
      typia.random<
        number & tags.Type<"int32"> & tags.Minimum<1> & tags.Maximum<100>
      >(),
    // Test-customizable: isActive flag
    is_active: input?.is_active ?? RandomGenerator.pick([true, false] as const),
  };
}