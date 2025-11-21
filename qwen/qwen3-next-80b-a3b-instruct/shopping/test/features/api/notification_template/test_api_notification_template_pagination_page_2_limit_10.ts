import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallNotificationTemplate } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallNotificationTemplate";
import type { IShoppingMallNotificationTemplate } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallNotificationTemplate";

export async function test_api_notification_template_pagination_page_2_limit_10(
  connection: api.IConnection,
): Promise<void> {
  const paginationData = {
    page: 2,
    limit: 10,
  } satisfies IShoppingMallNotificationTemplate.IRequest;

  const response: IPageIShoppingMallNotificationTemplate.ISummary =
    await api.functional.shoppingMall.notifications.templates.index(
      connection,
      {
        body: paginationData,
      },
    );

  typia.assert(response);

  // Validate pagination structure
  TestValidator.equals(
    "pagination page should be 2",
    response.pagination.current,
    2,
  );
  TestValidator.equals(
    "pagination limit should be 10",
    response.pagination.limit,
    10,
  );
  TestValidator.predicate(
    "pagination records should be greater than or equal to 0",
    response.pagination.records >= 0,
  );
  TestValidator.predicate(
    "pagination pages should be greater than or equal to 1",
    response.pagination.pages >= 1,
  );

  // Validate data array structure
  TestValidator.predicate(
    "data array should contain at most 10 items",
    response.data.length <= 10,
  );
  TestValidator.predicate(
    "each data item should be a valid UUID string",
    response.data.every((item) => {
      // ISummary is defined as type string, but API returns UUID format strings
      // So we enforce UUID format using typia.assertGuard
      try {
        typia.assertGuard<string & tags.Format<"uuid">>(item);
        return true;
      } catch {
        return false;
      }
    }),
  );
}
