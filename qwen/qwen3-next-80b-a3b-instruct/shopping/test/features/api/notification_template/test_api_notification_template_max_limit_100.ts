import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallNotificationTemplate } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallNotificationTemplate";
import type { IShoppingMallNotificationTemplate } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallNotificationTemplate";

export async function test_api_notification_template_max_limit_100(
  connection: api.IConnection,
) {
  // Create a request with maximum allowed limit of 100
  const request: IShoppingMallNotificationTemplate.IRequest = {
    page: 1,
    limit: 100,
  } satisfies IShoppingMallNotificationTemplate.IRequest;

  // Call the API endpoint to retrieve notification templates with max limit
  const response: IPageIShoppingMallNotificationTemplate.ISummary =
    await api.functional.shoppingMall.notifications.templates.index(
      connection,
      {
        body: request,
      },
    );

  // Validate the response structure and pagination
  typia.assert(response);

  // Verify that pagination correctly reflects the maximum limit
  TestValidator.equals(
    "pagination limit is 100",
    response.pagination.limit,
    100,
  );

  // Verify that page number is 1 as requested
  TestValidator.equals("pagination page is 1", response.pagination.current, 1);

  // Validate that data array exists and is of correct type
  TestValidator.predicate(
    "data array is not null",
    Array.isArray(response.data),
  );

  // Ensure all returned items are notification template summaries
  for (const template of response.data) {
    TestValidator.predicate(
      "each item is a string",
      typeof template === "string",
    );
  }
}
