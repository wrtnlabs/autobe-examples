import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";
import api from "@ORGANIZATION/PROJECT-api";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { ICommunityPlatformSaleTaxRate } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformSaleTaxRate";
export async function test_api_tax_rate_retrieval_by_valid_code(
  connection: api.IConnection,
): Promise<void> {
  // Generate a valid tax code in 'STATE-COUNTRY' format
  const stateCode = RandomGenerator.alphabets(2).toUpperCase();
  const countryCode = RandomGenerator.alphabets(2).toUpperCase();
  const taxCode = `${stateCode}-${countryCode}`;
  // Call the API endpoint to retrieve the tax rate
  const taxRate: ICommunityPlatformSaleTaxRate =
    await api.functional.communityPlatform.salestaxrates.at(connection, {
      taxCode,
    });
  // Validate the response structure and properties with typia.assert
  typia.assert(taxRate);
}
