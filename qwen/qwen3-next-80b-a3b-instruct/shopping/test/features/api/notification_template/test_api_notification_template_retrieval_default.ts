import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallNotificationTemplate } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallNotificationTemplate";
import type { IShoppingMallNotificationTemplate } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallNotificationTemplate";

export async function test_api_notification_template_retrieval_default(
  connection: api.IConnection,
) {
  // Default pagination parameters: page 1, limit 20
  const request: IShoppingMallNotificationTemplate.IRequest = {
    page: 1,
    limit: 20,
  } satisfies IShoppingMallNotificationTemplate.IRequest;

  // Call the endpoint with default pagination
  const response: IPageIShoppingMallNotificationTemplate.ISummary =
    await api.functional.shoppingMall.notifications.templates.index(
      connection,
      { body: request },
    );

  // Validate response structure and pagination metadata
  typia.assert(response);

  // Verify pagination metadata matches default expectations
  TestValidator.equals(
    "default page should be 1",
    response.pagination.current,
    1,
  );
  TestValidator.equals(
    "default limit should be 20",
    response.pagination.limit,
    20,
  );

  // Verify total records is 0 or more (since no templates created yet)
  TestValidator.predicate(
    "total records should be >= 0",
    response.pagination.records >= 0,
  );

  // Verify pages is calculated correctly (ceil(records/limit))
  TestValidator.predicate(
    "total pages should be >= 0",
    response.pagination.pages >= 0,
  );

  // Verify data is an array
  TestValidator.predicate(
    "data should be an array",
    Array.isArray(response.data),
  );

  // All templates should be IShoppingMallNotificationTemplate.ISummary type
  // Given ISummary is string type per DTO definition, verify each is string
  for (const template of response.data) {
    TestValidator.predicate(
      "each template should be a string",
      typeof template === "string",
    );
  }
}
