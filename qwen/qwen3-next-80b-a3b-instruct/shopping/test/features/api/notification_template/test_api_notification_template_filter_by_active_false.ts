import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallNotificationTemplate } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallNotificationTemplate";
import type { IShoppingMallNotificationTemplate } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallNotificationTemplate";

export async function test_api_notification_template_filter_by_active_false(
  connection: api.IConnection,
) {
  // Test retrieval of notification templates filtered by active status (false)
  // Validates that the API correctly accepts a filter request for inactive templates
  // and returns a properly structured response, even though template details
  // are limited to string summaries and cannot be further validated for active status.

  // Prepare filter request for inactive templates only
  const filterRequest: IShoppingMallNotificationTemplate.IRequest = {
    page: 1,
    limit: 10,
    active: false,
  };

  // Execute the filter request for inactive templates
  const response =
    await api.functional.shoppingMall.notifications.templates.index(
      connection,
      { body: filterRequest },
    );
  typia.assert(response);

  // Validate response structure
  TestValidator.equals(
    "pagination current page should be 1",
    response.pagination.current,
    1,
  );
  TestValidator.equals(
    "pagination limit should match request",
    response.pagination.limit,
    10,
  );
  TestValidator.predicate(
    "total records should be non-negative",
    response.pagination.records >= 0,
  );
  TestValidator.predicate(
    "total pages should be non-negative",
    response.pagination.pages >= 0,
  );
  TestValidator.predicate(
    "data array should exist",
    Array.isArray(response.data),
  );

  // Validate data elements are strings (as per IShoppingMallNotificationTemplate.ISummary = string)
  response.data.forEach((template) => {
    TestValidator.predicate(
      "each template summary should be a string",
      typeof template === "string",
    );
  });

  // Cannot validate that templates are inactive because the summary type is string
  // and does not contain active property. This is a limitation of the API design
  // and not a test failure.
}
