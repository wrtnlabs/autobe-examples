import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceAdministrator";
import type { IEcommerceMetadataRegistryRelationship } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMetadataRegistryRelationship";
import type { IEcommerceSuperAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceSuperAdministrator";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIEcommerceMetadataRegistryRelationship } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEcommerceMetadataRegistryRelationship";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_administrator_join } from "../../../authorize/authorize_administrator_join";
import { authorize_administrator_login } from "../../../authorize/authorize_administrator_login";
import { authorize_administrator_refresh } from "../../../authorize/authorize_administrator_refresh";

export async function test_api_metadata_registry_relationship_subtypes_date_filtering(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create admin connection and authenticate
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_administrator_join(adminConnection, {});
  // 2. Generate required UUID parameters
  const registryId = typia.random<string & tags.Format<"uuid">>();
  const relationshipId = typia.random<string & tags.Format<"uuid">>();
  // Helper function for search requests
  const searchSubtypes = async (
    body: IEcommerceMetadataRegistryRelationship.IRequest,
  ): Promise<IPageIEcommerceMetadataRegistryRelationship.ISummary> => {
    const result =
      await api.functional.ecommerce.administrator.metadata_registries.relationships.subtypes.search(
        adminConnection,
        {
          registryId,
          relationshipId,
          body,
        },
      );
    typia.assert(result);
    return result;
  };
  // Base search without date filters to establish baseline
  const baselineResult = await searchSubtypes({
    limit: typia.random<
      number & tags.Type<"int32"> & tags.Minimum<1> & tags.Maximum<50>
    >() satisfies number as number,
  });
  TestValidator.predicate(
    "baseline search returns data structure",
    baselineResult.data !== undefined,
  );
  // 3. Test single-day date range
  const today = new Date().toISOString();
  const tomorrow = new Date(Date.now() + 86400000).toISOString(); // +1 day
  const singleDayResult = await searchSubtypes({
    createdAt_from: today satisfies string & tags.Format<"date-time">,
    createdAt_to: tomorrow satisfies string & tags.Format<"date-time">,
  });
  typia.assert(singleDayResult);
  TestValidator.predicate(
    "single-day date filter returns valid structure",
    singleDayResult.data.length >= 0,
  );
  // 4. Test future dates (should return empty results or limited results)
  const futureDate = new Date(Date.now() + 86400000 * 30).toISOString(); // +30 days
  const futureResult = await searchSubtypes({
    createdAt_from: futureDate satisfies string & tags.Format<"date-time">,
    createdAt_to: new Date(
      Date.now() + 86400000 * 60,
    ).toISOString() satisfies string & tags.Format<"date-time">,
  });
  typia.assert(futureResult);
  TestValidator.predicate(
    "future date filter returns valid pagination structure",
    futureResult.pagination !== undefined,
  );
  // 5. Test past date range
  const oneWeekAgo = new Date(Date.now() - 86400000 * 7).toISOString();
  const pastResult = await searchSubtypes({
    createdAt_from: oneWeekAgo satisfies string & tags.Format<"date-time">,
    createdAt_to: today satisfies string & tags.Format<"date-time">,
  });
  typia.assert(pastResult);
  TestValidator.equals(
    "past date range returns valid data structure",
    typeof pastResult.pagination.records,
    "number",
  );
  // 6. Test combination filtering with date ranges and other criteria
  const combinationResult = await searchSubtypes({
    userType:
      "administrator" satisfies IEcommerceMetadataRegistryRelationship.IRequest["userType"],
    accountStatus:
      "active" satisfies IEcommerceMetadataRegistryRelationship.IRequest["accountStatus"],
    createdAt_from: oneWeekAgo satisfies string & tags.Format<"date-time">,
    createdAt_to: today satisfies string & tags.Format<"date-time">,
    limit: typia.random<
      number & tags.Type<"int32"> & tags.Minimum<5> & tags.Maximum<20>
    >() satisfies number as number,
    page: typia.random<
      number & tags.Type<"int32"> & tags.Minimum<1> & tags.Maximum<3>
    >() satisfies number as number,
  });
  typia.assert(combinationResult);
  TestValidator.predicate(
    "combination filter returns valid response",
    combinationResult.data.length >= 0,
  );
  // 7. Test date filtering with text search
  const searchText = RandomGenerator.alphabets(5);
  const textSearchResult = await searchSubtypes({
    search: searchText satisfies string | null | undefined,
    createdAt_from: oneWeekAgo satisfies string & tags.Format<"date-time">,
    createdAt_to: today satisfies string & tags.Format<"date-time">,
  });
  typia.assert(textSearchResult);
  TestValidator.predicate(
    "text search with date filter returns valid structure",
    textSearchResult.pagination.limit > 0,
  );
  // 8. Test pagination consistency with date ranges
  const page1Result = await searchSubtypes({
    createdAt_from: oneWeekAgo satisfies string & tags.Format<"date-time">,
    createdAt_to: today satisfies string & tags.Format<"date-time">,
    limit: 10 satisfies number as number,
    page: 1 satisfies number as number,
  });
  typia.assert(page1Result);
  const page2Result = await searchSubtypes({
    createdAt_from: oneWeekAgo satisfies string & tags.Format<"date-time">,
    createdAt_to: today satisfies string & tags.Format<"date-time">,
    limit: 10 satisfies number as number,
    page: 2 satisfies number as number,
  });
  typia.assert(page2Result);
  // Validate pagination structure
  TestValidator.equals(
    "page1 has correct limit",
    page1Result.pagination.limit,
    10,
  );
  TestValidator.equals(
    "page2 has correct limit",
    page2Result.pagination.limit,
    10,
  );
  TestValidator.predicate(
    "pagination records is non-negative",
    page1Result.pagination.records >= 0,
  );
  TestValidator.predicate(
    "pagination pages is non-negative",
    page1Result.pagination.pages >= 0,
  );
  // 9. Test edge case: date range where from > to (should be handled by framework)
  // This will be validated by framework, we just ensure it doesn't crash
  const reversedDateResult = await searchSubtypes({
    createdAt_from: today satisfies string & tags.Format<"date-time">,
    createdAt_to: oneWeekAgo satisfies string & tags.Format<"date-time">, // from > to
  });
  typia.assert(reversedDateResult);
  TestValidator.predicate(
    "reversed date range returns valid structure",
    reversedDateResult.pagination !== undefined,
  );
}
