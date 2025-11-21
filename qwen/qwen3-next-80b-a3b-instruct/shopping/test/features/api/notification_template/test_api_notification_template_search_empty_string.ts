import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallNotificationTemplate } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallNotificationTemplate";
import type { IShoppingMallNotificationTemplate } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallNotificationTemplate";

export async function test_api_notification_template_search_empty_string(
  connection: api.IConnection,
) {
  // Search with empty string - should return all templates
  const emptySearchResult =
    await api.functional.shoppingMall.notifications.templates.index(
      connection,
      {
        body: {
          page: 1,
          limit: 100,
          search: "", // Empty search string
        } satisfies IShoppingMallNotificationTemplate.IRequest,
      },
    );
  typia.assert(emptySearchResult);

  // Search with null search (no search parameter) to compare with empty search
  const noSearchResult =
    await api.functional.shoppingMall.notifications.templates.index(
      connection,
      {
        body: {
          page: 1,
          limit: 100,
          // search: undefined (omitted)
        } satisfies IShoppingMallNotificationTemplate.IRequest,
      },
    );
  typia.assert(noSearchResult);

  // Validate that empty search returns the same result as no search
  TestValidator.equals(
    "empty search and no search return same results",
    emptySearchResult.pagination.records,
    noSearchResult.pagination.records,
  );
  TestValidator.equals(
    "empty search and no search return same results",
    emptySearchResult.data.length,
    noSearchResult.data.length,
  );
  TestValidator.predicate(
    "empty search returns at least some templates",
    emptySearchResult.data.length > 0,
  );

  // Validate that all returned results are valid template summaries
  for (const template of emptySearchResult.data) {
    TestValidator.predicate(
      "template has valid id format",
      typeof template === "string" && template.length > 0,
    );
  }
}
