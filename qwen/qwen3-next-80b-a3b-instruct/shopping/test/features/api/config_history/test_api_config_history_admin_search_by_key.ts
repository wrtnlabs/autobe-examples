import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";
import api from "@ORGANIZATION/PROJECT-api";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallConfigHistory } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallConfigHistory";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallConfigHistory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallConfigHistory";
import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";
export async function test_api_config_history_admin_search_by_key(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Authenticate as admin using utility function
  const adminConnection: api.IConnection = { host: connection.host };
  const admin: IShoppingMallAdmin.IAuthorized = await authorize_admin_join(
    adminConnection,
    {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: RandomGenerator.alphaNumeric(16),
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
      } satisfies IShoppingMallAdmin.IJoin,
    },
  );
  typia.assert(admin);
  // Step 2: Search configuration history with a specific config_key
  // Use exact config_key from scenario description
  const searchQuery: IShoppingMallConfigHistory.IRequest = {
    config_key: "payment.gateway.enabled",
    page: 1,
    limit: 10,
  };
  const searchResult: IPageIShoppingMallConfigHistory =
    await api.functional.shoppingMall.admin.config.history.index(
      adminConnection,
      { body: searchQuery },
    );
  typia.assert(searchResult);
  // Step 3: Validate central response structure
  // All response fields should be present and correctly typed
  TestValidator.equals(
    "search result has pagination",
    searchResult.pagination !== undefined,
    true,
  );
  TestValidator.equals(
    "search result has data array",
    Array.isArray(searchResult.data),
    true,
  );
  // Validate pagination metadata
  TestValidator.equals(
    "pagination current page is 1",
    searchResult.pagination.current,
    1,
  );
  TestValidator.equals(
    "pagination limit is 10",
    searchResult.pagination.limit,
    10,
  );
  TestValidator.predicate(
    "pagination records is non-negative",
    () => searchResult.pagination.records >= 0,
  );
  TestValidator.predicate(
    "pagination pages is non-negative",
    () => searchResult.pagination.pages >= 0,
  );
  // Step 4: For each record in the results, validate structure
  for (const record of searchResult.data) {
    typia.assert(record);
    // Validate required fields
    TestValidator.equals("record id is UUID", typeof record.id, "string");
    TestValidator.predicate("record id matches UUID format", () =>
      /^[0-9a-f-]{36}$/.test(record.id),
    );
    TestValidator.equals(
      "record config_key is string",
      typeof record.config_key,
      "string",
    );
    TestValidator.predicate(
      "record config_key has content",
      () => record.config_key.length > 0,
    );
    TestValidator.equals(
      "record old_value is string",
      typeof record.old_value,
      "string",
    );
    TestValidator.equals(
      "record new_value is string",
      typeof record.new_value,
      "string",
    );
    // Removed invalid actor property access - does not exist on IShoppingMallConfigHistory
    TestValidator.equals(
      "record ip_address is string",
      typeof record.ip_address,
      "string",
    );
    TestValidator.predicate(
      "record ip_address has content",
      () => record.ip_address.length > 0,
    );
    TestValidator.equals(
      "record user_agent is string",
      typeof record.user_agent,
      "string",
    );
    TestValidator.predicate(
      "record user_agent has content",
      () => record.user_agent.length > 0,
    );
    TestValidator.equals(
      "record created_at is ISO date-time",
      typeof record.created_at,
      "string",
    );
    TestValidator.predicate("record created_at matches date-time format", () =>
      /^[0-9]{4}-(0[1-9]|1[0-2])-(0[1-9]|[12][0-9]|3[01])T([01][0-9]|2[0-3]):[0-5][0-9]:[0-5][0-9](?:\\.[0-9]{1,9})?(Z|[+-]([01][0-9]|2[0-3]):[0-5][0-9])$/.test(
        record.created_at,
      ),
    );
    // Validate metadata field is optional and properly structured if present
    if (record.metadata) {
      TestValidator.equals(
        "metadata is object",
        typeof record.metadata,
        "object",
      );
      // Metadata is type string | undefined, so we don't validate its content
      // We only validate that it's not null and has expected type
    }
  }
  // Step 5: Test with a non-existent config_key to verify empty results
  const unrelatedSearch: IShoppingMallConfigHistory.IRequest = {
    config_key: "non.existent.key",
    page: 1,
    limit: 10,
  };
  const unrelatedResult: IPageIShoppingMallConfigHistory =
    await api.functional.shoppingMall.admin.config.history.index(
      adminConnection,
      { body: unrelatedSearch },
    );
  typia.assert(unrelatedResult);
  // Verify search with non-existent key returns empty results
  TestValidator.equals(
    "unrelated search has zero records",
    unrelatedResult.data.length,
    0,
  );
  TestValidator.equals(
    "unrelated search pagination records is 0",
    unrelatedResult.pagination.records,
    0,
  );
  TestValidator.equals(
    "unrelated search pagination pages is 0",
    unrelatedResult.pagination.pages,
    0,
  );
  // Step 6: Test different page and limit parameters
  const page2Limit5: IShoppingMallConfigHistory.IRequest = {
    config_key: "payment.gateway.enabled",
    page: 2,
    limit: 5,
  };
  const page2Result: IPageIShoppingMallConfigHistory =
    await api.functional.shoppingMall.admin.config.history.index(
      adminConnection,
      { body: page2Limit5 },
    );
  typia.assert(page2Result);
  // Validate pagination for page 2, limit 5
  TestValidator.equals(
    "page 2 current is 2",
    page2Result.pagination.current,
    2,
  );
  TestValidator.equals("page 2 limit is 5", page2Result.pagination.limit, 5);
  TestValidator.predicate(
    "page 2 records is non-negative",
    () => page2Result.pagination.records >= 0,
  );
  TestValidator.predicate(
    "page 2 pages is non-negative",
    () => page2Result.pagination.pages >= 0,
  );
  // Step 7: Test minimum limit
  const minLimit: IShoppingMallConfigHistory.IRequest = {
    config_key: "payment.gateway.enabled",
    page: 1,
    limit: 1, // Minimum allowed limit
  };
  const minLimitResult: IPageIShoppingMallConfigHistory =
    await api.functional.shoppingMall.admin.config.history.index(
      adminConnection,
      { body: minLimit },
    );
  typia.assert(minLimitResult);
  TestValidator.equals(
    "minimum limit pagination limit is 1",
    minLimitResult.pagination.limit,
    1,
  );
  TestValidator.predicate(
    "minimum limit records is non-negative",
    () => minLimitResult.pagination.records >= 0,
  );
  // Step 8: Test maximum limit
  const maxLimit: IShoppingMallConfigHistory.IRequest = {
    config_key: "payment.gateway.enabled",
    page: 1,
    limit: 100, // Maximum allowed limit
  };
  const maxLimitResult: IPageIShoppingMallConfigHistory =
    await api.functional.shoppingMall.admin.config.history.index(
      adminConnection,
      { body: maxLimit },
    );
  typia.assert(maxLimitResult);
  TestValidator.equals(
    "maximum limit pagination limit is 100",
    maxLimitResult.pagination.limit,
    100,
  );
  TestValidator.predicate(
    "maximum limit records is non-negative",
    () => maxLimitResult.pagination.records >= 0,
  );
}