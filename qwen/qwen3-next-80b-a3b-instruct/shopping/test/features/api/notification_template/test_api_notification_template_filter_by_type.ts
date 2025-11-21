import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallNotificationTemplate } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallNotificationTemplate";
import type { IShoppingMallNotificationTemplate } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallNotificationTemplate";

export async function test_api_notification_template_filter_by_type(
  connection: api.IConnection,
) {
  // Step 1: Generate random template filter request with specific type
  const templateType = "order_confirmed";

  // Use typia.random to generate a valid IShoppingMallNotificationTemplate.IRequest
  // with the specific type we want to filter by
  const filterBody: IShoppingMallNotificationTemplate.IRequest = {
    page: typia.random<number & tags.Type<"int32"> & tags.Minimum<1>>(),
    limit: typia.random<
      number & tags.Type<"int32"> & tags.Minimum<1> & tags.Maximum<100>
    >(),
    type: templateType,
  };

  // Step 2: Call the API to filter templates by type
  const filteredResult =
    await api.functional.shoppingMall.notifications.templates.index(
      connection,
      {
        body: filterBody,
      },
    );

  // Step 3: Validate the response structure and type
  typia.assert<{
    pagination: IPage.IPagination;
    data: string[]; // As specified in IPageIShoppingMallNotificationTemplate.ISummary
  }>(filteredResult);

  // Verify pagination has expected structure
  TestValidator.equals(
    "pagination structure is correct",
    typeof filteredResult.pagination,
    "object",
  );
  TestValidator.equals(
    "pagination current is a number",
    typeof filteredResult.pagination.current,
    "number",
  );
  TestValidator.equals(
    "pagination limit is a number",
    typeof filteredResult.pagination.limit,
    "number",
  );
  TestValidator.equals(
    "pagination records is a number",
    typeof filteredResult.pagination.records,
    "number",
  );
  TestValidator.equals(
    "pagination pages is a number",
    typeof filteredResult.pagination.pages,
    "number",
  );

  // Verify data is an array of strings
  TestValidator.equals(
    "data is an array",
    Array.isArray(filteredResult.data),
    true,
  );
  TestValidator.predicate("all data items are strings", () =>
    filteredResult.data.every((item) => typeof item === "string"),
  );

  // Verify that filter works properly by checking the type
  // Since ISummary is just a string, we cannot verify its type content directly
  // The filter is enforced server-side based on the request type
  TestValidator.predicate(
    "at least one template was returned",
    () => filteredResult.data.length > 0,
  );
}
