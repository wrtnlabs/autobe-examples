import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallNotificationTemplate } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallNotificationTemplate";
import type { IShoppingMallNotificationTemplate } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallNotificationTemplate";

export async function test_api_notification_template_min_limit_1(
  connection: api.IConnection,
) {
  // Step 1: Create a minimal request with limit set to 1 (minimum allowed value)
  const request: IShoppingMallNotificationTemplate.IRequest = {
    page: 1,
    limit: 1,
  };

  // Step 2: Call the endpoint with minimal pagination
  const result: IPageIShoppingMallNotificationTemplate.ISummary =
    await api.functional.shoppingMall.notifications.templates.index(
      connection,
      {
        body: request,
      },
    );

  // Step 3: Validate the response structure and type
  typia.assert(result);

  // Step 4: Validate pagination properties
  TestValidator.equals(
    "pagination page should be 1",
    result.pagination.current,
    1,
  );
  TestValidator.equals(
    "pagination limit should be 1",
    result.pagination.limit,
    1,
  );
  TestValidator.predicate(
    "pagination records should be >= 0",
    result.pagination.records >= 0,
  );
  TestValidator.predicate(
    "pagination pages should be >= 0",
    result.pagination.pages >= 0,
  );

  // Step 5: Validate data array contains at most 1 element (system MUST respect limit=1)
  TestValidator.predicate(
    "data array length should be <= 1",
    result.data.length <= 1,
  );

  // Step 6: Validate that template items are strings (ISummary type as defined)
  for (let i = 0; i < result.data.length; i++) {
    TestValidator.predicate(
      `template at index ${i} should be a string`,
      typeof result.data[i] === "string",
    );
    TestValidator.predicate(
      `template at index ${i} should have content`,
      result.data[i].length > 0,
    );
  }
}
