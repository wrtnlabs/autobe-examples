import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallAdministratorRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallAdministratorRequest";
import type { IShoppingMallAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdministrator";
import type { IShoppingMallAdministratorRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdministratorRequest";
import type { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import type { IShoppingMallCustomerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomerProfile";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_customer_join } from "../../../authorize/authorize_customer_join";
import { authorize_customer_login } from "../../../authorize/authorize_customer_login";
import { authorize_customer_refresh } from "../../../authorize/authorize_customer_refresh";

/**
 * Test administrator promotion request pagination with custom page and pageSize parameters.
 *
 * Validates that super administrators can paginate through administrator requests with custom pagination settings. Tests that page 2 returns the correct subset of results when pageSize is set to 10, and that pagination metadata accurately reflects the current position and total counts.
 *
 * Special attention is given to verifying that results on page 2 are different from page 1 (no duplicates) when data exists, and that ordering by created_at DESC is maintained across pages.
 *
 * 1. Register and authenticate as a customer (super administrator).
 * 2. Fetch page 1 of administrator requests with pageSize=10 to establish baseline.
 * 3. Fetch page 2 of administrator requests with pageSize=10.
 * 4. Verify pagination metadata for page 2: current=2, limit=10, correct records and pages.
 * 5. Verify data array contains expected number of items based on total records.
 * 6. Verify no duplicate IDs between page 1 and page 2 results (when both pages have data).
 * 7. Verify results are ordered by created_at DESC within page 2 (when data exists).
 */
export async function test_api_administrator_request_pagination(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register and authenticate as customer (super administrator)
  const customerConnection: api.IConnection = { host: connection.host };
  await authorize_customer_join(customerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "1234",
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    },
  });
  // 2. Fetch page 1 with pageSize=10 to establish baseline
  const page1 =
    await api.functional.shoppingMall.customer.administrator_requests.index(
      customerConnection,
      {
        body: {
          page: 1,
          pageSize: 10,
        } satisfies IShoppingMallAdministratorRequest.IRequest,
      },
    );
  typia.assert(page1);
  // 3. Fetch page 2 with pageSize=10
  const page2 =
    await api.functional.shoppingMall.customer.administrator_requests.index(
      customerConnection,
      {
        body: {
          page: 2,
          pageSize: 10,
        } satisfies IShoppingMallAdministratorRequest.IRequest,
      },
    );
  typia.assert(page2);
  // 4. Verify pagination metadata for page 2
  TestValidator.equals("current page is 2", page2.pagination.current, 2);
  TestValidator.equals("limit is 10", page2.pagination.limit, 10);
  TestValidator.predicate(
    "records count is non-negative",
    page2.pagination.records >= 0,
  );
  TestValidator.predicate(
    "pages count is non-negative",
    page2.pagination.pages >= 0,
  );
  // 5. Verify data array length matches expected based on total records
  const expectedPage2Length =
    page2.pagination.records <= 10
      ? 0
      : Math.min(10, page2.pagination.records - 10);
  TestValidator.equals(
    "page 2 data length matches expected",
    page2.data.length,
    expectedPage2Length,
  );
  // 6. Verify no duplicate IDs between page 1 and page 2 (only if page 2 has data)
  if (page2.data.length > 0 && page1.data.length > 0) {
    const page1Ids = new Set(page1.data.map((item) => item.id));
    const page2Ids = new Set(page2.data.map((item) => item.id));
    const hasDuplicates = Array.from(page2Ids).some((id) => page1Ids.has(id));
    TestValidator.predicate(
      "no duplicate IDs between page 1 and page 2",
      !hasDuplicates,
    );
  }
  // 7. Verify results are ordered by created_at DESC within page 2 (if multiple items)
  if (page2.data.length > 1) {
    for (let i = 1; i < page2.data.length; i++) {
      const currentItem = new Date(page2.data[i].created_at).getTime();
      const previousItem = new Date(page2.data[i - 1].created_at).getTime();
      TestValidator.predicate(
        `item ${i} created_at <= item ${i - 1} created_at`,
        currentItem <= previousItem,
      );
    }
  }
  // 8. Verify pagination consistency: pages should equal ceiling(records / limit)
  const expectedPages =
    page2.pagination.records === 0
      ? 0
      : Math.ceil(page2.pagination.records / 10);
  TestValidator.equals(
    "pages count equals ceiling(records/limit)",
    page2.pagination.pages,
    expectedPages,
  );
}
