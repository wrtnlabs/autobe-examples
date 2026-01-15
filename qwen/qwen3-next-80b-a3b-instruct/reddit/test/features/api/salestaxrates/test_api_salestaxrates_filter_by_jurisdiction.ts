import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";
import api from "@ORGANIZATION/PROJECT-api";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { ICommunityPlatformSaleTaxRate } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformSaleTaxRate";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageICommunityPlatformSaleTaxRate } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageICommunityPlatformSaleTaxRate";
export async function test_api_salestaxrates_filter_by_jurisdiction(
  connection: api.IConnection,
): Promise<void> {
  // Create a connection for making API calls
  const baseConnection: api.IConnection = { host: connection.host };
  // Test filtering by a jurisdiction that should exist
  const californiaResult =
    await api.functional.communityPlatform.salestaxrates.index(baseConnection, {
      body: {
        page: 1,
        limit: 10,
        jurisdiction: "California",
      } satisfies ICommunityPlatformSaleTaxRate.IRequest,
    });
  typia.assert(californiaResult);
  // Test filtering by a jurisdiction that shouldn't exist
  const nonExistentResult =
    await api.functional.communityPlatform.salestaxrates.index(baseConnection, {
      body: {
        page: 1,
        limit: 10,
        jurisdiction: "NonExistentState",
      } satisfies ICommunityPlatformSaleTaxRate.IRequest,
    });
  typia.assert(nonExistentResult);
  // Validate that non-existent jurisdiction returns empty array
  TestValidator.equals(
    "Non-existent jurisdiction filter returns empty array",
    nonExistentResult.data.length,
    0,
  );
  // Validate that existing jurisdiction returns at least one result
  TestValidator.predicate(
    "California filter returns at least one record",
    () => californiaResult.data.length > 0,
  );
}
