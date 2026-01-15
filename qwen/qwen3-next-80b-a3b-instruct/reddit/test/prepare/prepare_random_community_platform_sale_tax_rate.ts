import { ArrayUtil, RandomGenerator } from "@nestia/e2e";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ICommunityPlatformSaleTaxRate } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformSaleTaxRate";
export function prepare_random_community_platform_sale_tax_rate(
  input?: DeepPartial<ICommunityPlatformSaleTaxRate.ICreate>,
): ICommunityPlatformSaleTaxRate.ICreate {
  return {
    taxAuthority: input?.taxAuthority ?? RandomGenerator.alphabets(5),
    startDate:
      input?.startDate ??
      RandomGenerator.date(new Date(), 1000 * 60 * 60 * 24).toISOString(),
    jurisdictionCode:
      input?.jurisdictionCode ??
      RandomGenerator.pick([
        undefined,
        RandomGenerator.alphabets(2),
        RandomGenerator.alphabets(3),
      ]),
    productCategoryCode:
      input?.productCategoryCode ??
      RandomGenerator.pick([
        undefined,
        RandomGenerator.alphabets(8).toUpperCase(),
        RandomGenerator.alphabets(10).toUpperCase(),
      ]),
  };
}

