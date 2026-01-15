import { ArrayUtil, RandomGenerator } from "@nestia/e2e";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ICommunityPlatformSaleCurrencyRate } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformSaleCurrencyRate";
export function prepare_random_community_platform_sale_currency_rate(input?: DeepPartial<ICommunityPlatformSaleCurrencyRate.ICreate> | undefined): ICommunityPlatformSaleCurrencyRate.ICreate {
    const baseDate = new Date(Date.now() + typia.random<number & tags.Type<'uint32'> & tags.Minimum<60000> & tags.Maximum<86400000>>());
    const effectiveFromValue = input?.effectiveFrom ?? baseDate.toISOString();
    const effectiveToValue = RandomGenerator.pick([true, false] as const)
        ? new Date(new Date(effectiveFromValue).getTime() + typia.random<number & tags.Type<'uint32'> & tags.Minimum<86400000> & tags.Maximum<2592000000>>()).toISOString()
        : undefined;
    
    return {
        fromCurrency: input?.fromCurrency ?? RandomGenerator.pick(["USD", "EUR", "JPY", "GBP", "AUD", "CAD", "CHF", "CNY", "SEK", "NZD"] as const),
        toCurrency: input?.toCurrency ?? (() => { const currencies = ["USD", "EUR", "JPY", "GBP", "AUD", "CAD", "CHF", "CNY", "SEK", "NZD"] as const; const available = currencies.filter(c => c !== (input?.fromCurrency ?? RandomGenerator.pick(currencies))); return RandomGenerator.pick(available); })(),
        rate: input?.rate ?? typia.random<number & tags.Type<'uint32'> & tags.MultipleOf<1e-8> & tags.ExclusiveMinimum<0>>(),
        effectiveFrom: effectiveFromValue,
        effectiveTo: effectiveToValue
    };
}