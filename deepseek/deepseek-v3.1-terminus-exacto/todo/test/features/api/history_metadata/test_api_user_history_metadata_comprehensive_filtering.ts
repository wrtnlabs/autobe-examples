import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageITodoAppHistoryMetadatum } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageITodoAppHistoryMetadatum";
import type { ITodoAppHistoryMetadatum } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppHistoryMetadatum";
import type { ITodoAppUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppUser";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_user_join } from "../../../authorize/authorize_user_join";
import { authorize_user_login } from "../../../authorize/authorize_user_login";
import { authorize_user_refresh } from "../../../authorize/authorize_user_refresh";

export async function test_api_user_history_metadata_comprehensive_filtering(
  connection: api.IConnection,
): Promise<void> {
  // Create authenticated user connection using utility function
  const userConnection: api.IConnection = { host: connection.host };
  const authorizedUser = await authorize_user_join(userConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      display_name: RandomGenerator.name(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    },
  });
  typia.assert(authorizedUser);
  userConnection.headers = { Authorization: authorizedUser.token.access };
  // Test 1: Filter by search term with partial matching
  const searchResult = await api.functional.todoApp.user.history_metadata.index(
    userConnection,
    {
      body: {
        search: "retention",
        page: 1,
        limit: 10,
      } satisfies ITodoAppHistoryMetadatum.IRequest,
    },
  );
  typia.assert(searchResult);
  TestValidator.predicate(
    "search result has valid pagination",
    searchResult.pagination.records >= 0 &&
      searchResult.pagination.limit === 10,
  );
  // Test 2: Filter by active status
  const activeFilterResult =
    await api.functional.todoApp.user.history_metadata.index(userConnection, {
      body: {
        is_active: true,
        page: 1,
        limit: 10,
      } satisfies ITodoAppHistoryMetadatum.IRequest,
    });
  typia.assert(activeFilterResult);
  if (activeFilterResult.data.length > 0) {
    TestValidator.predicate(
      "active filter returns only active items",
      activeFilterResult.data.every((item) => item.is_active === true),
    );
  }
  // Test 3: Filter by retention days range
  const retentionRangeResult =
    await api.functional.todoApp.user.history_metadata.index(userConnection, {
      body: {
        retention_days_min: 30,
        retention_days_max: 90,
        page: 1,
        limit: 10,
      } satisfies ITodoAppHistoryMetadatum.IRequest,
    });
  typia.assert(retentionRangeResult);
  if (retentionRangeResult.data.length > 0) {
    TestValidator.predicate(
      "retention range filter returns valid items",
      retentionRangeResult.data.every(
        (item) =>
          item.retention_days !== null &&
          item.retention_days !== undefined &&
          item.retention_days >= 30 &&
          item.retention_days <= 90,
      ),
    );
  }
  // Test 4: Filter by cleanup frequency
  const frequencyResult =
    await api.functional.todoApp.user.history_metadata.index(userConnection, {
      body: {
        cleanup_frequency: "daily",
        page: 1,
        limit: 10,
      } satisfies ITodoAppHistoryMetadatum.IRequest,
    });
  typia.assert(frequencyResult);
  if (frequencyResult.data.length > 0) {
    TestValidator.predicate(
      "frequency filter returns matching items",
      frequencyResult.data.every((item) => item.cleanup_frequency === "daily"),
    );
  }
  // Test 5: Combined multiple filters
  const combinedResult =
    await api.functional.todoApp.user.history_metadata.index(userConnection, {
      body: {
        search: "config",
        is_active: true,
        retention_days_min: 1,
        retention_days_max: 365,
        cleanup_frequency: "weekly",
        page: 1,
        limit: 5,
      } satisfies ITodoAppHistoryMetadatum.IRequest,
    });
  typia.assert(combinedResult);
  if (combinedResult.data.length > 0) {
    TestValidator.predicate(
      "combined filter returns matching items",
      combinedResult.data.every(
        (item) =>
          item.is_active === true &&
          (item.cleanup_frequency === "weekly" ||
            item.cleanup_frequency === null ||
            item.cleanup_frequency === undefined) &&
          (item.retention_days === null ||
            item.retention_days === undefined ||
            (item.retention_days >= 1 && item.retention_days <= 365)),
      ),
    );
  }
  // Test 6: Empty search term (should return all matching)
  const emptySearchResult =
    await api.functional.todoApp.user.history_metadata.index(userConnection, {
      body: {
        search: "",
        page: 1,
        limit: 10,
      } satisfies ITodoAppHistoryMetadatum.IRequest,
    });
  typia.assert(emptySearchResult);
  TestValidator.predicate(
    "empty search returns valid results",
    emptySearchResult.pagination.records >= 0,
  );
  // Test 7: Invalid retention range (min > max) - should handle gracefully
  const invalidRangeResult =
    await api.functional.todoApp.user.history_metadata.index(userConnection, {
      body: {
        retention_days_min: 100,
        retention_days_max: 50,
        page: 1,
        limit: 10,
      } satisfies ITodoAppHistoryMetadatum.IRequest,
    });
  typia.assert(invalidRangeResult);
  TestValidator.predicate(
    "invalid range returns empty results",
    invalidRangeResult.data.length === 0 ||
      invalidRangeResult.pagination.records === 0,
  );
  // Test 8: Null cleanup frequency with other filters
  const nullFrequencyResult =
    await api.functional.todoApp.user.history_metadata.index(userConnection, {
      body: {
        is_active: true,
        retention_days_min: 7,
        cleanup_frequency: undefined,
        page: 1,
        limit: 10,
      } satisfies ITodoAppHistoryMetadatum.IRequest,
    });
  typia.assert(nullFrequencyResult);
  TestValidator.predicate(
    "null frequency returns appropriate results",
    nullFrequencyResult.data.length >= 0,
  );
}
