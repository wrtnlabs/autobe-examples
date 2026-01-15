import { ArrayUtil, RandomGenerator } from "@nestia/e2e";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IShoppingMallPaymentRegion } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallPaymentRegion";
export function prepare_random_shopping_mall_payment_region(
  input?: DeepPartial<IShoppingMallPaymentRegion.ICreate>,
): IShoppingMallPaymentRegion.ICreate {
  return {
    // Test-customizable fields (use RandomGenerator for human-readable text)
    region_code:
      input?.region_code ?? RandomGenerator.alphabets(2).toUpperCase(),
    currency_code:
      input?.currency_code ?? RandomGenerator.alphabets(3).toUpperCase(),
    primary_gateway:
      input?.primary_gateway ??
      RandomGenerator.alphaNumeric(
        typia.random<
          number & tags.Type<"uint32"> & tags.Minimum<5> & tags.Maximum<15>
        >(),
      ),
    // Arrays with nested objects (secondary_gateways)
    secondary_gateways:
      input?.secondary_gateways ??
      ArrayUtil.repeat(
        typia.random<
          number & tags.Type<"uint32"> & tags.Minimum<0> & tags.Maximum<5>
        >(),
        () =>
          RandomGenerator.alphaNumeric(
            typia.random<
              number & tags.Type<"uint32"> & tags.Minimum<5> & tags.Maximum<15>
            >(),
          ),
      ),
    // TAX regulations format "[A-Z]{2}-[A-Z0-9]+"
    tax_regulations:
      input?.tax_regulations ??
      `${RandomGenerator.alphabets(2).toUpperCase()}-${RandomGenerator.alphaNumeric(typia.random<number & tags.Type<"uint32"> & tags.Minimum<3> & tags.Maximum<10>>())}`,
    // Auto-generated fields with constraints
    fraud_threshold:
      input?.fraud_threshold ??
      typia.random<number & tags.Minimum<0> & tags.Maximum<1000000>>(),
    enable_card_tokenization:
      input?.enable_card_tokenization ??
      RandomGenerator.pick([true, false] as const),
    localization_rules:
      input?.localization_rules ??
      RandomGenerator.alphaNumeric(
        typia.random<
          number & tags.Type<"uint32"> & tags.Minimum<5> & tags.Maximum<15>
        >(),
      ),
    data_retention_period:
      input?.data_retention_period ??
      typia.random<
        number & tags.Type<"int32"> & tags.Minimum<12> & tags.Maximum<120>
      >(),
    enabled: input?.enabled ?? RandomGenerator.pick([true, false] as const),
  };
}
